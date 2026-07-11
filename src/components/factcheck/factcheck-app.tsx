"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/factcheck/empty-state";
import { SessionHeader } from "@/components/factcheck/session-header";
import { TranscriptPane } from "@/components/factcheck/transcript-pane";
import { UnsupportedBrowser } from "@/components/factcheck/unsupported-browser";
import { VerdictFeed } from "@/components/factcheck/verdict-feed";
import { useFactcheckSession } from "@/hooks/use-factcheck-session";

export function FactcheckApp() {
  const session = useFactcheckSession();
  const deniedToasted = useRef(false);

  useEffect(() => {
    if (session.micStatus === "denied" && !deniedToasted.current) {
      deniedToasted.current = true;
      toast.error("Microphone permission denied", {
        description:
          "Allow mic access in your browser settings, then press Start again.",
      });
    }
    if (session.micStatus !== "denied") {
      deniedToasted.current = false;
    }
  }, [session.micStatus]);

  if (session.browserSupported === false) {
    return (
      <div className="flex min-h-screen flex-col">
        <SessionHeader
          isActive={false}
          micStatus="unsupported"
          elapsedMs={0}
          checksUsed={0}
          extractInFlight={false}
          onStart={() => undefined}
          onStop={() => undefined}
        />
        <UnsupportedBrowser />
      </div>
    );
  }

  const showEmpty =
    !session.isActive &&
    session.segments.length === 0 &&
    session.claims.length === 0;

  return (
    <div className="flex min-h-screen flex-col">
      <SessionHeader
        isActive={session.isActive}
        micStatus={session.micStatus}
        elapsedMs={session.elapsedMs}
        checksUsed={session.checksUsed}
        extractInFlight={session.extractInFlight}
        onStart={() => void session.start()}
        onStop={session.stop}
      />

      {showEmpty ? (
        <EmptyState />
      ) : (
        <div className="mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 grid-cols-1 lg:grid-cols-5 lg:overflow-hidden lg:h-[calc(100vh-57px)]">
          <div className="min-h-[40vh] border-b border-border/80 lg:col-span-2 lg:min-h-0 lg:border-b-0">
            <TranscriptPane
              segments={session.segments}
              interimText={session.interimText}
              claims={session.claims}
              isActive={session.isActive}
            />
          </div>
          <div className="min-h-[50vh] lg:col-span-3 lg:min-h-0">
            <VerdictFeed
              claims={session.claims}
              onRetry={session.retryClaim}
            />
          </div>
        </div>
      )}
    </div>
  );
}
