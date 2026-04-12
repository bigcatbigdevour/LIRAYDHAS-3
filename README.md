# LIRAYDHAS

> *Love Isn't Real And You Don't Have A Soul.*
> *Love Is Real And You Do Have A Soul.*

A philosophy Q&A experience. Every question is generated live by Claude to challenge the assumption in the user's previous answer. There is no end, no progress bar, no bottom.

## Stack

- Next.js 14 (App Router, TypeScript)
- Anthropic Claude API (`@anthropic-ai/sdk`) — `claude-sonnet-4-5` by default
- Plain CSS — all-white background, faint sacred-geometry SVG, single blue accent
- `localStorage` for session persistence

## Setup

```bash
npm install
cp .env.example .env.local
# edit .env.local and add your ANTHROPIC_API_KEY
npm run dev
```

Open <http://localhost:3000>.

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | yes | Key used by the server-side routes |
| `ANTHROPIC_MODEL`   | no  | Override the Claude model |

## Routes

- `POST /api/question` — given the `history`, returns the next question. If history is empty, returns a fresh opening question.
- `POST /api/analyze` — given `{ question, answer, priorThemes? }`, returns `{ themes, certaintyScore, contradictions, resistance }` JSON.

## Data

Each answered question is stored locally as a `PsycheEntry`:

```ts
{
  id, sessionId, index,
  question, answer, timestamp,
  themes: string[],
  certaintyScore: number,      // 0..1
  contradictions: string[],
  resistance: string[],
  depthTier: number,           // ladder for a future reward system
  wordCount: number,
  engagement: { dwellMs?: number, revised: boolean }
}
```

The schema is intentionally broader than what the UI uses, so a later engagement-based reward system can consume it without migrations.
