import { NextResponse } from "next/server";

import {
  CLAIM_EXTRACTION_SYSTEM_PROMPT,
} from "@/lib/prompts";
import { tryParseModelJson } from "@/lib/json";
import { extractWithModel } from "@/lib/openrouter";
import type { ExtractRequest, ExtractResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function isValidRequest(body: unknown): body is ExtractRequest {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.transcript === "string" &&
    Array.isArray(b.existingClaims) &&
    b.existingClaims.every((c) => typeof c === "string")
  );
}

async function runExtraction(
  transcript: string,
  existingClaims: string[]
): Promise<string[]> {
  const userPrompt = `Existing claims already extracted (do not repeat these):
${JSON.stringify(existingClaims, null, 2)}

Recent debate transcript:
"""
${transcript}
"""

Extract only NEW check-worthy factual claims as JSON: {"claims": string[]}`;

  const messages = [
    { role: "system" as const, content: CLAIM_EXTRACTION_SYSTEM_PROMPT },
    { role: "user" as const, content: userPrompt },
  ];

  let raw = await extractWithModel(messages);
  let parsed = tryParseModelJson<{ claims?: unknown }>(raw);

  if (!parsed) {
    // Retry once with a stricter reminder
    raw = await extractWithModel([
      ...messages,
      {
        role: "assistant",
        content: raw,
      },
      {
        role: "user",
        content:
          "Your previous response was not valid JSON. Reply with ONLY valid JSON matching {\"claims\": string[]} — no code fences, no prose.",
      },
    ]);
    parsed = tryParseModelJson<{ claims?: unknown }>(raw);
  }

  if (!parsed || !Array.isArray(parsed.claims)) {
    throw new Error("Failed to parse claim extraction JSON after retry");
  }

  return parsed.claims
    .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
    .map((c) => c.trim());
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is not configured on the server" },
        { status: 500 }
      );
    }

    const body: unknown = await request.json();
    if (!isValidRequest(body)) {
      return NextResponse.json(
        { error: "Invalid request. Expected { transcript: string, existingClaims: string[] }" },
        { status: 400 }
      );
    }

    if (!body.transcript.trim()) {
      const empty: ExtractResponse = { claims: [] };
      return NextResponse.json(empty);
    }

    const claims = await runExtraction(body.transcript, body.existingClaims);
    const response: ExtractResponse = { claims };
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    console.error("[/api/extract]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
