import type { VerdictRating } from "@/lib/types";

export function ratingLabel(rating: VerdictRating): string {
  switch (rating) {
    case "true":
      return "True";
    case "mostly-true":
      return "Mostly True";
    case "misleading":
      return "Misleading";
    case "false":
      return "False";
    case "unverifiable":
      return "Unverifiable";
    default: {
      const _exhaustive: never = rating;
      return _exhaustive;
    }
  }
}

/** Tailwind classes for verdict rating badges */
export function ratingBadgeClass(rating: VerdictRating): string {
  switch (rating) {
    case "true":
      return "bg-verdict-true text-white border-transparent";
    case "mostly-true":
      return "bg-verdict-mostly-true text-zinc-950 border-transparent";
    case "misleading":
      return "bg-verdict-misleading text-zinc-950 border-transparent";
    case "false":
      return "bg-verdict-false text-white border-transparent";
    case "unverifiable":
      return "bg-verdict-unverifiable text-white border-transparent";
    default: {
      const _exhaustive: never = rating;
      return _exhaustive;
    }
  }
}

/** Transcript highlight background by rating */
export function ratingHighlightClass(rating: VerdictRating | undefined): string {
  if (!rating) return "bg-primary/20 text-foreground";
  switch (rating) {
    case "true":
      return "bg-verdict-true/25 text-verdict-true ring-1 ring-verdict-true/40";
    case "mostly-true":
      return "bg-verdict-mostly-true/25 text-verdict-mostly-true ring-1 ring-verdict-mostly-true/40";
    case "misleading":
      return "bg-verdict-misleading/25 text-verdict-misleading ring-1 ring-verdict-misleading/40";
    case "false":
      return "bg-verdict-false/25 text-verdict-false ring-1 ring-verdict-false/40";
    case "unverifiable":
      return "bg-verdict-unverifiable/25 text-muted-foreground ring-1 ring-verdict-unverifiable/40";
    default: {
      const _exhaustive: never = rating;
      return _exhaustive;
    }
  }
}

export function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Simple client-side semantic-ish dedupe via normalized text */
export function normalizeClaimText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isDuplicateClaim(
  candidate: string,
  existing: string[]
): boolean {
  const norm = normalizeClaimText(candidate);
  if (!norm) return true;
  return existing.some((e) => {
    const en = normalizeClaimText(e);
    if (!en) return false;
    if (en === norm) return true;
    // Soft overlap: one contains the other and lengths are close
    const shorter = en.length < norm.length ? en : norm;
    const longer = en.length < norm.length ? norm : en;
    if (longer.includes(shorter) && shorter.length / longer.length > 0.7) {
      return true;
    }
    return false;
  });
}

export function createId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}
