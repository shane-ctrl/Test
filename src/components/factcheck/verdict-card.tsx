"use client";

import { ChevronDown, ExternalLink, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { Claim } from "@/lib/types";
import { ratingBadgeClass, ratingLabel } from "@/lib/verdict-styles";
import { cn } from "@/lib/utils";

type VerdictCardProps = {
  claim: Claim;
  onRetry: (id: string) => void;
};

export function VerdictCard({ claim, onRetry }: VerdictCardProps) {
  if (claim.status === "queued" || claim.status === "checking") {
    return (
      <article className="animate-card-in rounded-xl border border-border/70 bg-card/60 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-md" />
          <span className="text-xs text-muted-foreground animate-pulse">
            Checking…
          </span>
        </div>
        <p className="mb-3 text-sm leading-relaxed text-foreground/90">
          {claim.text}
        </p>
        <Skeleton className="mb-2 h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <div className="mt-4">
          <Skeleton className="h-1.5 w-full rounded-full" />
        </div>
      </article>
    );
  }

  if (claim.status === "error") {
    return (
      <article className="animate-card-in rounded-xl border border-verdict-false/30 bg-card/60 p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <Badge variant="outline" className="border-verdict-false/50 text-verdict-false">
            Error
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1.5 text-xs"
            onClick={() => onRetry(claim.id)}
          >
            <RotateCcw className="h-3 w-3" />
            Retry
          </Button>
        </div>
        <p className="mb-2 text-sm leading-relaxed">{claim.text}</p>
        <p className="text-xs text-muted-foreground">
          {claim.errorMessage ?? "Verification failed. Try again."}
        </p>
      </article>
    );
  }

  const verdict = claim.verdict;
  if (!verdict) return null;

  return (
    <article className="animate-card-in rounded-xl border border-border/70 bg-card/70 p-4 shadow-sm shadow-black/20">
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <Badge className={cn("font-medium", ratingBadgeClass(verdict.rating))}>
          {ratingLabel(verdict.rating)}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {Math.round(verdict.confidence * 100)}% confidence
        </span>
      </div>

      <p className="mb-2 text-sm font-medium leading-relaxed text-foreground">
        {claim.text}
      </p>
      <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
        {verdict.summary}
      </p>

      <div className="mb-3">
        <Progress value={verdict.confidence * 100} className="h-1.5" />
      </div>

      {verdict.sources.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="group flex w-full items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
            {verdict.sources.length} source
            {verdict.sources.length === 1 ? "" : "s"}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {verdict.sources.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-xs transition-colors hover:bg-muted/50"
              >
                <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                <span>
                  <span className="font-medium text-foreground">
                    {source.title}
                  </span>
                  {source.note ? (
                    <span className="mt-0.5 block text-muted-foreground">
                      {source.note}
                    </span>
                  ) : null}
                </span>
              </a>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </article>
  );
}
