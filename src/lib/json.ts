/**
 * Strip markdown code fences and parse JSON, with one retry-friendly error.
 */
export function stripCodeFences(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }
  return cleaned.trim();
}

export function parseModelJson<T>(text: string): T {
  const cleaned = stripCodeFences(text);
  return JSON.parse(cleaned) as T;
}

/**
 * Attempt to parse model JSON. On failure, returns null so caller can retry.
 */
export function tryParseModelJson<T>(text: string): T | null {
  try {
    return parseModelJson<T>(text);
  } catch {
    return null;
  }
}
