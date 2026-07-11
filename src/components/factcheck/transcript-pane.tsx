"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import type { Claim, TranscriptSegment, VerdictRating } from "@/lib/types";
import { ratingHighlightClass } from "@/lib/verdict-styles";
import { cn } from "@/lib/utils";

type TranscriptPaneProps = {
  segments: TranscriptSegment[];
  interimText: string;
  claims: Claim[];
  isActive: boolean;
};

type HighlightSpan = {
  start: number;
  end: number;
  claimId: string;
  rating: VerdictRating | undefined;
};

function findClaimSpans(fullText: string, claims: Claim[]): HighlightSpan[] {
  const lower = fullText.toLowerCase();
  const spans: HighlightSpan[] = [];

  for (const claim of claims) {
    // Try to find a distinctive substring of the claim in the transcript
    const words = claim.text
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3);

    if (words.length < 2) continue;

    // Search for the longest contiguous run of claim words present in transcript
    let best: { start: number; end: number } | null = null;
    for (let len = Math.min(words.length, 8); len >= 2; len--) {
      for (let i = 0; i <= words.length - len; i++) {
        const phrase = words.slice(i, i + len).join(" ");
        const idx = lower.indexOf(phrase);
        if (idx !== -1) {
          best = { start: idx, end: idx + phrase.length };
          break;
        }
      }
      if (best) break;
    }

    if (best) {
      spans.push({
        start: best.start,
        end: best.end,
        claimId: claim.id,
        rating: claim.verdict?.rating,
      });
    }
  }

  // Sort and de-overlap (keep first)
  spans.sort((a, b) => a.start - b.start || b.end - a.end);
  const result: HighlightSpan[] = [];
  let cursor = 0;
  for (const span of spans) {
    if (span.start < cursor) continue;
    result.push(span);
    cursor = span.end;
  }
  return result;
}

function HighlightedTranscript({
  text,
  claims,
}: {
  text: string;
  claims: Claim[];
}) {
  const spans = useMemo(() => findClaimSpans(text, claims), [text, claims]);

  if (!text) return null;
  if (spans.length === 0) {
    return <>{text}</>;
  }

  const parts: ReactNode[] = [];
  let cursor = 0;
  spans.forEach((span, i) => {
    if (span.start > cursor) {
      parts.push(
        <span key={`t-${i}-pre`}>{text.slice(cursor, span.start)}</span>
      );
    }
    parts.push(
      <mark
        key={span.claimId}
        className={cn(
          "rounded-sm px-0.5 py-px transition-colors",
          ratingHighlightClass(span.rating)
        )}
        title="Fact-checked claim"
      >
        {text.slice(span.start, span.end)}
      </mark>
    );
    cursor = span.end;
  });
  if (cursor < text.length) {
    parts.push(<span key="t-tail">{text.slice(cursor)}</span>);
  }
  return <>{parts}</>;
}

export function TranscriptPane({
  segments,
  interimText,
  claims,
  isActive,
}: TranscriptPaneProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const finalText = segments.map((s) => s.text).join(" ");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [finalText, interimText]);

  const isEmpty = segments.length === 0 && !interimText;

  return (
    <section className="flex h-full min-h-0 flex-col border-r border-border/80">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Live transcript
        </h2>
        {isActive && (
          <span className="text-xs text-muted-foreground animate-pulse-soft">
            Capturing…
          </span>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="px-4 py-4 text-[15px] leading-7 text-foreground/90 sm:px-5">
          {isEmpty ? (
            <p className="text-muted-foreground">
              {isActive
                ? "Waiting for speech…"
                : "Press Start and speak — or play a debate clip near your mic — to begin."}
            </p>
          ) : (
            <p className="whitespace-pre-wrap">
              <HighlightedTranscript text={finalText} claims={claims} />
              {interimText ? (
                <span className="text-muted-foreground/55 italic">
                  {finalText ? " " : ""}
                  {interimText}
                </span>
              ) : null}
            </p>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </section>
  );
}
