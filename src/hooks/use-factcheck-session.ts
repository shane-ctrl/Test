"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import {
  EXTRACT_CHAR_THRESHOLD,
  EXTRACT_DEBOUNCE_MS,
  MAX_CHECKS_PER_SESSION,
  MAX_CONCURRENT_VERIFICATIONS,
  TRANSCRIPT_WINDOW_MS,
} from "@/lib/constants";
import type {
  Claim,
  ExtractResponse,
  MicStatus,
  TranscriptSegment,
  Verdict,
} from "@/lib/types";
import { createId, isDuplicateClaim } from "@/lib/verdict-styles";
import { WebSpeechTranscriptionProvider } from "@/transcription";
import type { TranscriptionProvider } from "@/transcription/types";

type SessionState = {
  isActive: boolean;
  micStatus: MicStatus;
  elapsedMs: number;
  segments: TranscriptSegment[];
  interimText: string;
  claims: Claim[];
  checksUsed: number;
  extractInFlight: boolean;
};

function getRecentTranscript(
  segments: TranscriptSegment[],
  windowMs: number
): string {
  if (segments.length === 0) return "";
  const latest = segments[segments.length - 1]?.timestamp ?? 0;
  const cutoff = latest - windowMs;
  return segments
    .filter((s) => s.isFinal && s.timestamp >= cutoff)
    .map((s) => s.text)
    .join(" ");
}

function subscribeNoop() {
  return () => undefined;
}

function getSpeechSupportSnapshot(): boolean {
  return new WebSpeechTranscriptionProvider().isSupported();
}

function getSpeechSupportServerSnapshot(): boolean {
  return true; // assume supported on SSR; corrected on client
}

export function useFactcheckSession() {
  const providerRef = useRef<TranscriptionProvider | null>(null);
  const sessionStartRef = useRef<number>(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const charsSinceExtractRef = useRef(0);
  const activeVerificationsRef = useRef(0);
  const verifyQueueRef = useRef<string[]>([]);
  const claimsRef = useRef<Claim[]>([]);
  const segmentsRef = useRef<TranscriptSegment[]>([]);
  const checksUsedRef = useRef(0);
  const isActiveRef = useRef(false);
  const extractInFlightRef = useRef(false);
  const processVerifyQueueRef = useRef<() => void>(() => undefined);

  const browserSupported = useSyncExternalStore(
    subscribeNoop,
    getSpeechSupportSnapshot,
    getSpeechSupportServerSnapshot
  );

  const [state, setState] = useState<SessionState>({
    isActive: false,
    micStatus: "idle",
    elapsedMs: 0,
    segments: [],
    interimText: "",
    claims: [],
    checksUsed: 0,
    extractInFlight: false,
  });

  const micStatus: MicStatus = !browserSupported
    ? "unsupported"
    : state.micStatus;

  useEffect(() => {
    claimsRef.current = state.claims;
  }, [state.claims]);
  useEffect(() => {
    segmentsRef.current = state.segments;
  }, [state.segments]);
  useEffect(() => {
    checksUsedRef.current = state.checksUsed;
  }, [state.checksUsed]);
  useEffect(() => {
    isActiveRef.current = state.isActive;
  }, [state.isActive]);
  useEffect(() => {
    extractInFlightRef.current = state.extractInFlight;
  }, [state.extractInFlight]);

  useEffect(() => {
    if (!state.isActive) return;
    const id = setInterval(() => {
      setState((s) => ({
        ...s,
        elapsedMs: Date.now() - sessionStartRef.current,
      }));
    }, 250);
    return () => clearInterval(id);
  }, [state.isActive]);

  const updateClaim = useCallback((id: string, patch: Partial<Claim>) => {
    setState((s) => ({
      ...s,
      claims: s.claims.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }, []);

  useEffect(() => {
    processVerifyQueueRef.current = () => {
      while (
        activeVerificationsRef.current < MAX_CONCURRENT_VERIFICATIONS &&
        verifyQueueRef.current.length > 0
      ) {
        const claimId = verifyQueueRef.current.shift();
        if (!claimId) break;

        const claim = claimsRef.current.find((c) => c.id === claimId);
        if (!claim) continue;

        activeVerificationsRef.current += 1;
        updateClaim(claimId, { status: "checking" });

        void (async () => {
          try {
            const res = await fetch("/api/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ claim: claim.text }),
            });
            const data: unknown = await res.json();
            if (!res.ok) {
              const errMsg =
                data &&
                typeof data === "object" &&
                "error" in data &&
                typeof (data as { error: unknown }).error === "string"
                  ? (data as { error: string }).error
                  : "Verification failed";
              updateClaim(claimId, {
                status: "error",
                errorMessage: errMsg,
              });
              return;
            }
            updateClaim(claimId, {
              status: "done",
              verdict: data as Verdict,
              errorMessage: undefined,
            });
          } catch (err) {
            updateClaim(claimId, {
              status: "error",
              errorMessage:
                err instanceof Error ? err.message : "Verification failed",
            });
          } finally {
            activeVerificationsRef.current -= 1;
            processVerifyQueueRef.current();
          }
        })();
      }
    };
  }, [updateClaim]);

  const enqueueClaims = useCallback((texts: string[], timestamp: number) => {
    const existingTexts = claimsRef.current.map((c) => c.text);
    const room = MAX_CHECKS_PER_SESSION - checksUsedRef.current;
    if (room <= 0) return;

    const fresh = texts
      .filter((t) => !isDuplicateClaim(t, existingTexts))
      .slice(0, room);

    if (fresh.length === 0) return;

    const newClaims: Claim[] = fresh.map((text) => ({
      id: createId("claim"),
      text,
      timestamp,
      status: "queued" as const,
    }));

    setState((s) => ({
      ...s,
      claims: [...newClaims, ...s.claims],
      checksUsed: s.checksUsed + newClaims.length,
    }));

    for (const c of newClaims) {
      verifyQueueRef.current.push(c.id);
    }
    processVerifyQueueRef.current();
  }, []);

  const runExtraction = useCallback(async () => {
    if (extractInFlightRef.current) return;
    if (checksUsedRef.current >= MAX_CHECKS_PER_SESSION) return;

    const transcript = getRecentTranscript(
      segmentsRef.current,
      TRANSCRIPT_WINDOW_MS
    );
    if (!transcript.trim()) return;

    const existingClaims = claimsRef.current.map((c) => c.text);
    charsSinceExtractRef.current = 0;
    setState((s) => ({ ...s, extractInFlight: true }));

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, existingClaims }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        console.error("[extract]", data);
        return;
      }
      const claims = (data as ExtractResponse).claims ?? [];
      const latestTs =
        segmentsRef.current[segmentsRef.current.length - 1]?.timestamp ??
        Date.now() - sessionStartRef.current;
      enqueueClaims(claims, latestTs);
    } catch (err) {
      console.error("[extract]", err);
    } finally {
      setState((s) => ({ ...s, extractInFlight: false }));
    }
  }, [enqueueClaims]);

  const scheduleExtraction = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      void runExtraction();
    }, EXTRACT_DEBOUNCE_MS);

    if (charsSinceExtractRef.current >= EXTRACT_CHAR_THRESHOLD) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      void runExtraction();
    }
  }, [runExtraction]);

  const handleFinalSegment = useCallback(
    (text: string, timestamp: number) => {
      const segment: TranscriptSegment = {
        id: createId("seg"),
        text,
        isFinal: true,
        timestamp,
      };
      charsSinceExtractRef.current += text.length;
      setState((s) => ({
        ...s,
        segments: [...s.segments, segment],
        interimText: "",
      }));
      scheduleExtraction();
    },
    [scheduleExtraction]
  );

  const start = useCallback(async () => {
    const provider =
      providerRef.current ?? new WebSpeechTranscriptionProvider();
    providerRef.current = provider;

    if (!provider.isSupported()) {
      return;
    }

    verifyQueueRef.current = [];
    activeVerificationsRef.current = 0;
    charsSinceExtractRef.current = 0;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    sessionStartRef.current = Date.now();

    setState({
      isActive: true,
      micStatus: "listening",
      elapsedMs: 0,
      segments: [],
      interimText: "",
      claims: [],
      checksUsed: 0,
      extractInFlight: false,
    });

    await provider.start({
      onTranscript: (event) => {
        if (!isActiveRef.current) return;
        if (event.isFinal) {
          handleFinalSegment(event.text, event.timestamp);
        } else {
          setState((s) => ({ ...s, interimText: event.text }));
        }
      },
      onStatusChange: (status) => {
        setState((s) => ({ ...s, micStatus: status }));
      },
      onError: (message) => {
        console.error("[transcription]", message);
        if (message.toLowerCase().includes("denied")) {
          setState((s) => ({
            ...s,
            micStatus: "denied",
            isActive: false,
          }));
        }
      },
    });
  }, [handleFinalSegment]);

  const stop = useCallback(() => {
    providerRef.current?.stop();
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    void runExtraction();
    setState((s) => ({
      ...s,
      isActive: false,
      micStatus: "idle",
      interimText: "",
    }));
  }, [runExtraction]);

  const retryClaim = useCallback(
    (claimId: string) => {
      updateClaim(claimId, {
        status: "queued",
        errorMessage: undefined,
        verdict: undefined,
      });
      verifyQueueRef.current.push(claimId);
      processVerifyQueueRef.current();
    },
    [updateClaim]
  );

  useEffect(() => {
    return () => {
      providerRef.current?.stop();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  return {
    ...state,
    micStatus,
    browserSupported,
    start,
    stop,
    retryClaim,
    maxChecks: MAX_CHECKS_PER_SESSION,
  };
}
