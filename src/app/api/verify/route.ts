import { NextResponse } from "next/server";

import { VERIFICATION_SYSTEM_PROMPT } from "@/lib/prompts";
import { tryParseModelJson } from "@/lib/json";
import { verifyWithModel } from "@/lib/openrouter";
import { buildSearchQuery, searchWeb, type TavilyResult } from "@/lib/tavily";
import type { Verdict, VerdictRating, VerdictSource, VerifyRequest } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const VALID_RATINGS: VerdictRating[] = [
  "true",
  "mostly-true",
  "misleading",
  "false",
  "unverifiable",
];

function isValidRequest(body: unknown): body is VerifyRequest {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return typeof b.claim === "string" && b.claim.trim().length > 0;
}

function formatSourcesForPrompt(sources: TavilyResult[]): string {
  if (sources.length === 0) {
    return "(No search results returned.)";
  }
  return sources
    .map(
      (s, i) =>
        `[${i + 1}] Title: ${s.title}
URL: ${s.url}
${s.published_date ? `Date: ${s.published_date}\n` : ""}Snippet: ${s.content}`
    )
    .join("\n\n");
}

/** Normalize URLs so slight model rewrites still match Tavily results. */
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    u.hash = "";
    // Drop trailing slash for comparison
    const path = u.pathname.replace(/\/$/, "") || "/";
    return `${u.protocol}//${u.host.toLowerCase()}${path}${u.search}`;
  } catch {
    return url.trim().replace(/\/$/, "").toLowerCase();
  }
}

function tavilyAsSources(results: TavilyResult[]): VerdictSource[] {
  return results.slice(0, 5).map((s) => ({
    title: s.title || s.url,
    url: s.url,
    note: s.content ? s.content.slice(0, 160) : undefined,
  }));
}

function normalizeVerdict(
  raw: Partial<Verdict>,
  searchResults: TavilyResult[]
): Verdict {
  const rating = VALID_RATINGS.includes(raw.rating as VerdictRating)
    ? (raw.rating as VerdictRating)
    : "unverifiable";

  const confidence =
    typeof raw.confidence === "number" && Number.isFinite(raw.confidence)
      ? Math.min(1, Math.max(0, raw.confidence))
      : 0.5;

  const summary =
    typeof raw.summary === "string" && raw.summary.trim()
      ? raw.summary.trim()
      : "Unable to produce a clear summary from the available sources.";

  const byNormUrl = new Map(
    searchResults.map((s) => [normalizeUrl(s.url), s] as const)
  );

  // Prefer model-cited sources that match real search hits; fall back to all Tavily hits
  // so the UI always shows research when the web search ran.
  const cited: VerdictSource[] = [];
  if (Array.isArray(raw.sources)) {
    for (const s of raw.sources) {
      if (!s || typeof s !== "object") continue;
      if (typeof s.title !== "string" || typeof s.url !== "string") continue;
      const hit = byNormUrl.get(normalizeUrl(s.url));
      if (!hit) continue;
      cited.push({
        title: s.title.trim() || hit.title || hit.url,
        url: hit.url,
        ...(typeof s.note === "string" && s.note.trim()
          ? { note: s.note.trim() }
          : hit.content
            ? { note: hit.content.slice(0, 160) }
            : {}),
      });
    }
  }

  const sources = cited.length > 0 ? cited : tavilyAsSources(searchResults);

  return { rating, confidence, summary, sources };
}

async function runVerification(claim: string): Promise<Verdict> {
  const query = buildSearchQuery(claim);
  const searchResults = await searchWeb(query, 5);

  // If no sources at all, force unverifiable — but still return empty sources honestly
  if (searchResults.length === 0) {
    return {
      rating: "unverifiable",
      confidence: 0.2,
      summary:
        "No relevant web sources were found for this claim, so it cannot be verified.",
      sources: [],
    };
  }

  const userPrompt = `Claim to verify:
"""
${claim}
"""

Web search sources:
${formatSourcesForPrompt(searchResults)}

Return a verdict as strict JSON matching the Verdict schema.
You MUST cite sources using ONLY the exact URLs listed above.`;

  const messages = [
    { role: "system" as const, content: VERIFICATION_SYSTEM_PROMPT },
    { role: "user" as const, content: userPrompt },
  ];

  let raw = await verifyWithModel(messages);
  let parsed = tryParseModelJson<Partial<Verdict>>(raw);

  if (!parsed) {
    raw = await verifyWithModel([
      ...messages,
      { role: "assistant", content: raw },
      {
        role: "user",
        content:
          'Your previous response was not valid JSON. Reply with ONLY valid JSON matching {"rating","confidence","summary","sources"} — no code fences, no prose.',
      },
    ]);
    parsed = tryParseModelJson<Partial<Verdict>>(raw);
  }

  if (!parsed) {
    // Research succeeded even if the model JSON failed — still show sources.
    return {
      rating: "unverifiable",
      confidence: 0.3,
      summary:
        "Web sources were found, but the model failed to return a valid verdict. Review the sources below.",
      sources: tavilyAsSources(searchResults),
    };
  }

  return normalizeVerdict(parsed, searchResults);
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is not configured on the server" },
        { status: 500 }
      );
    }
    if (!process.env.TAVILY_API_KEY) {
      return NextResponse.json(
        { error: "TAVILY_API_KEY is not configured on the server" },
        { status: 500 }
      );
    }

    const body: unknown = await request.json();
    if (!isValidRequest(body)) {
      return NextResponse.json(
        { error: "Invalid request. Expected { claim: string }" },
        { status: 400 }
      );
    }

    const verdict = await runVerification(body.claim.trim());
    return NextResponse.json(verdict);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    console.error("[/api/verify]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
