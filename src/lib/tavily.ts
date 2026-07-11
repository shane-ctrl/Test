import { TAVILY_BASE_URL } from "@/lib/constants";

export type TavilyResult = {
  title: string;
  url: string;
  content: string;
  score?: number;
  published_date?: string;
};

type TavilyResponse = {
  results?: TavilyResult[];
  error?: string;
};

function getApiKey(): string {
  const key = process.env.TAVILY_API_KEY;
  if (!key) {
    throw new Error("TAVILY_API_KEY is not configured");
  }
  return key;
}

export async function searchWeb(
  query: string,
  maxResults = 5
): Promise<TavilyResult[]> {
  const response = await fetch(TAVILY_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: getApiKey(),
      query,
      search_depth: "advanced",
      include_answer: false,
      include_raw_content: false,
      max_results: maxResults,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Tavily error ${response.status}: ${body}`);
  }

  const data = (await response.json()) as TavilyResponse;
  if (data.error) {
    throw new Error(`Tavily error: ${data.error}`);
  }

  return data.results ?? [];
}

export function buildSearchQuery(claim: string): string {
  const trimmed = claim.trim();
  // Keep queries focused; Tavily works best with concise factual queries
  const core = trimmed.length <= 180 ? trimmed : trimmed.slice(0, 180);
  return `${core} fact check evidence`;
}
