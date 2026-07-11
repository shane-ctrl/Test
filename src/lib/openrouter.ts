import {
  EXTRACT_MODEL,
  OPENROUTER_BASE_URL,
  VERIFY_MODEL,
} from "@/lib/constants";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenRouterChoice = {
  message?: { content?: string | null };
};

type OpenRouterResponse = {
  choices?: OpenRouterChoice[];
  error?: { message?: string };
};

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }
  return key;
}

async function requestCompletion(options: {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  useJsonFormat: boolean;
}): Promise<Response> {
  return fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "FactCheck Live",
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.1,
      max_tokens: options.maxTokens ?? 2048,
      ...(options.useJsonFormat
        ? { response_format: { type: "json_object" } }
        : {}),
    }),
  });
}

function looksLikeJsonFormatUnsupported(status: number, body: string): boolean {
  if (status !== 400 && status !== 404 && status !== 422) return false;
  const lower = body.toLowerCase();
  return (
    lower.includes("response_format") ||
    lower.includes("json_object") ||
    lower.includes("structured output") ||
    lower.includes("not supported")
  );
}

export async function chatCompletion(options: {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  let response = await requestCompletion({ ...options, useJsonFormat: true });
  let bodyText = await response.text();

  // Some free models reject JSON mode — retry without it so research still runs.
  if (
    !response.ok &&
    looksLikeJsonFormatUnsupported(response.status, bodyText)
  ) {
    response = await requestCompletion({ ...options, useJsonFormat: false });
    bodyText = await response.text();
  }

  if (!response.ok) {
    throw new Error(`OpenRouter error ${response.status}: ${bodyText}`);
  }

  let data: OpenRouterResponse;
  try {
    data = JSON.parse(bodyText) as OpenRouterResponse;
  } catch {
    throw new Error(`OpenRouter returned non-JSON body: ${bodyText.slice(0, 200)}`);
  }

  if (data.error?.message) {
    throw new Error(`OpenRouter error: ${data.error.message}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenRouter returned empty content");
  }
  return content;
}

export function extractWithModel(messages: ChatMessage[]): Promise<string> {
  return chatCompletion({
    model: EXTRACT_MODEL,
    messages,
    temperature: 0.1,
    maxTokens: 1024,
  });
}

export function verifyWithModel(messages: ChatMessage[]): Promise<string> {
  return chatCompletion({
    model: VERIFY_MODEL,
    messages,
    temperature: 0.1,
    maxTokens: 1536,
  });
}
