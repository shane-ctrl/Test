/** Maximum fact-checks allowed per listening session. */
export const MAX_CHECKS_PER_SESSION = 30;

/** Debounce window before sending transcript for claim extraction. */
export const EXTRACT_DEBOUNCE_MS = 8_000;

/** Trigger extraction early if this many new characters arrive. */
export const EXTRACT_CHAR_THRESHOLD = 400;

/** How much recent transcript (ms) to send to the extraction model. */
export const TRANSCRIPT_WINDOW_MS = 2 * 60 * 1000;

/** Concurrent verification workers. */
export const MAX_CONCURRENT_VERIFICATIONS = 3;

/** OpenRouter models */
export const EXTRACT_MODEL = "anthropic/claude-haiku-4.5";
export const VERIFY_MODEL = "anthropic/claude-sonnet-4.5";

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
export const TAVILY_BASE_URL = "https://api.tavily.com/search";
