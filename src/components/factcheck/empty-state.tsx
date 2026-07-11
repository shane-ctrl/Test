"use client";

import { Headphones, Mic, Search, Sparkles } from "lucide-react";

const STEPS = [
  {
    icon: Mic,
    title: "Listen",
    body: "Start a session and let the app hear the debate through your microphone.",
  },
  {
    icon: Sparkles,
    title: "Detect claims",
    body: "As speech is transcribed, check-worthy factual claims are extracted automatically.",
  },
  {
    icon: Search,
    title: "Verify live",
    body: "Each claim is searched on the web and scored with a clear verdict and sources.",
  },
] as const;

export function EmptyState() {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center px-6 py-12">
      <div className="animate-fade-up max-w-xl text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Headphones className="h-7 w-7" />
        </div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Fact-check a live debate
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Press <span className="text-foreground">Start</span>, play a debate
          clip on YouTube (or speak yourself), and watch verdict cards appear
          as claims are spoken.
        </p>
      </div>

      <ol className="mt-10 grid w-full max-w-3xl gap-4 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            className="animate-fade-up rounded-xl border border-border/60 bg-card/40 p-4 text-left"
            style={{ animationDelay: `${120 + i * 80}ms` }}
          >
            <step.icon className="mb-3 h-5 w-5 text-primary" />
            <p className="text-sm font-medium">{step.title}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
