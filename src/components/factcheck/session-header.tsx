"use client";

import { Mic, MicOff, Radio, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MAX_CHECKS_PER_SESSION } from "@/lib/constants";
import type { MicStatus } from "@/lib/types";
import { formatElapsed } from "@/lib/verdict-styles";
import { cn } from "@/lib/utils";

type SessionHeaderProps = {
  isActive: boolean;
  micStatus: MicStatus;
  elapsedMs: number;
  checksUsed: number;
  extractInFlight: boolean;
  onStart: () => void;
  onStop: () => void;
};

function MicIndicator({ status }: { status: MicStatus }) {
  const label = (() => {
    switch (status) {
      case "listening":
        return "Listening";
      case "denied":
        return "Mic denied";
      case "unsupported":
        return "Unsupported";
      case "error":
        return "Mic error";
      case "idle":
        return "Mic idle";
      default: {
        const _exhaustive: never = status;
        return _exhaustive;
      }
    }
  })();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-medium",
        status === "listening" &&
          "border-verdict-true/40 bg-verdict-true/10 text-verdict-true",
        status === "denied" &&
          "border-verdict-false/40 bg-verdict-false/10 text-verdict-false",
        status === "unsupported" &&
          "border-verdict-unverifiable/40 bg-verdict-unverifiable/10 text-muted-foreground",
        status === "error" &&
          "border-verdict-misleading/40 bg-verdict-misleading/10 text-verdict-misleading",
        status === "idle" && "border-border bg-muted/40 text-muted-foreground"
      )}
    >
      {status === "listening" ? (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-verdict-true opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-verdict-true" />
        </span>
      ) : status === "denied" || status === "error" ? (
        <MicOff className="h-3.5 w-3.5" />
      ) : (
        <Mic className="h-3.5 w-3.5" />
      )}
      {label}
    </div>
  );
}

export function SessionHeader({
  isActive,
  micStatus,
  elapsedMs,
  checksUsed,
  extractInFlight,
  onStart,
  onStop,
}: SessionHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Radio className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-heading text-lg font-semibold tracking-tight sm:text-xl">
              FactCheck Live
            </h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Real-time debate fact-checker
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <div className="hidden font-mono text-sm tabular-nums text-muted-foreground sm:block">
            {formatElapsed(elapsedMs)}
          </div>
          <MicIndicator status={micStatus} />
          <div
            className={cn(
              "rounded-md border px-2.5 py-1 font-mono text-xs tabular-nums",
              checksUsed >= MAX_CHECKS_PER_SESSION
                ? "border-verdict-misleading/40 bg-verdict-misleading/10 text-verdict-misleading"
                : "border-border bg-muted/40 text-muted-foreground"
            )}
            title="Fact-checks used this session"
          >
            {checksUsed}/{MAX_CHECKS_PER_SESSION}
            {extractInFlight ? " · extracting…" : ""}
          </div>
          {isActive ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={onStop}
              className="gap-1.5"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              Stop
            </Button>
          ) : (
            <Button size="sm" onClick={onStart} className="gap-1.5">
              <Mic className="h-3.5 w-3.5" />
              Start
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
