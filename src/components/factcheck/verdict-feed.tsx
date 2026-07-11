"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { VerdictCard } from "@/components/factcheck/verdict-card";
import type { Claim } from "@/lib/types";

type VerdictFeedProps = {
  claims: Claim[];
  onRetry: (id: string) => void;
};

export function VerdictFeed({ claims, onRetry }: VerdictFeedProps) {
  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Verdicts
        </h2>
        <span className="text-xs text-muted-foreground">
          {claims.length === 0
            ? "Waiting for claims"
            : `${claims.length} claim${claims.length === 1 ? "" : "s"}`}
        </span>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-3 px-4 py-4 sm:px-5">
          {claims.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Check-worthy claims will appear here as they&apos;re detected and
              verified against web sources.
            </p>
          ) : (
            claims.map((claim) => (
              <VerdictCard key={claim.id} claim={claim} onRetry={onRetry} />
            ))
          )}
        </div>
      </ScrollArea>
    </section>
  );
}
