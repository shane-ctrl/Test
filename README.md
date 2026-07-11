# FactCheck Live

Real-time debate fact-checker. The app listens through your microphone, transcribes speech, extracts check-worthy factual claims, verifies each claim against web sources, and shows verdict cards as the debate unfolds.

## Stack

- **Next.js** (App Router) + TypeScript + Tailwind + shadcn/ui
- **Speech-to-text:** Web Speech API (Chrome/Edge), behind a `TranscriptionProvider` interface
- **LLMs:** OpenRouter free models (GPT-OSS 20B for extraction, Qwen3 80B for verification)
- **Web search:** Tavily (top 5 results)
- **State:** client-side only for MVP (no database)

## Setup

1. **Install dependencies**

```bash
npm install
```

2. **Add API keys**

Copy the example env file and fill in your keys:

```bash
cp .env.example .env.local
```

You need:

| Variable | Where to get it |
|---|---|
| `OPENROUTER_API_KEY` | [openrouter.ai/keys](https://openrouter.ai/keys) |
| `TAVILY_API_KEY` | [tavily.com](https://tavily.com) |

3. **Run the app**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in **Chrome** or **Edge** (required for the Web Speech API).

## Demo flow

1. Open a debate clip on YouTube (or any video with spoken claims).
2. Turn your speaker volume up so the laptop mic can hear it (or use system audio loopback if you have it).
3. In FactCheck Live, click **Start** and allow microphone access.
4. Watch the left pane fill with a live transcript. Interim (not-yet-final) words appear ghosted.
5. After ~8 seconds of speech (or ~400 new characters), claims are extracted. Verdict cards appear on the right — first as “Checking…”, then with a rating, summary, confidence bar, and expandable sources.
6. Click **Stop** when you’re done. There’s a hard cap of **30 checks per session**.

## How the pipeline works

1. **Capture & transcribe** — mic → interim + final transcript segments (auto-restarts if Web Speech drops).
2. **Claim extraction** — debounced call to `/api/extract` with the last ~2 minutes of transcript + already-seen claims.
3. **Verification** — each new claim → `/api/verify` → Tavily search → verification model → verdict JSON. Up to 3 checks run at once; the rest queue.
4. **Render** — transcript highlights + newest-first verdict feed.

## Project layout

```
src/
  app/
    api/extract/route.ts   # claim extraction (OpenRouter)
    api/verify/route.ts    # Tavily + verification (OpenRouter)
    page.tsx
  components/factcheck/    # UI
  hooks/use-factcheck-session.ts
  lib/                     # types, prompts, OpenRouter, Tavily helpers
  transcription/           # TranscriptionProvider + Web Speech impl
```

## Notes & limits

- Web Speech API ≈ **Chrome / Edge only**. Other browsers show an unsupported message.
- API keys stay **server-side** in route handlers — never sent to the client.
- Malformed model JSON is stripped of code fences and retried once; then the claim is marked `error` (with Retry).
- Repeated talking points are deduped client-side so they don’t burn API calls.

## Stretch goals (not in MVP)

- Speaker diarization / manual speaker toggle
- Supabase persistence + shareable debate report card
- Deepgram as a second `TranscriptionProvider`
- Per-speaker accuracy scoreboard
