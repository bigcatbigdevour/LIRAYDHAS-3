import { NextResponse } from 'next/server';
import { getClient, MODEL, textOf } from '@/lib/claude';
import type { AnalyzeRequestBody, AnalyzeResponseBody } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ANALYZE_SYSTEM = `You are a quiet observer of a philosophical dialogue. For each (question, answer) pair, return a compact JSON object describing the psychological texture of the answer. Do not analyze the content as true or false — only its shape.

Return ONLY JSON (no markdown fences, no preamble) with this exact schema:
{
  "themes": string[],            // 1–4 short lowercase noun phrases (e.g. "love", "self", "time", "control")
  "certaintyScore": number,      // 0.0–1.0, how absolute/closed the answer sounds
  "contradictions": string[],    // 0–3 short phrases naming tensions vs. prior themes, or internal contradictions
  "resistance": string[]         // 0–3 short phrases naming evasion / deflection / refusal patterns if present
}

Keep every string under 5 words. Prefer single words where possible. Be precise, not poetic. Output must be valid JSON.`;

export async function POST(req: Request) {
  let body: AnalyzeRequestBody;
  try {
    body = (await req.json()) as AnalyzeRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { question, answer, priorThemes = [] } = body ?? {};
  if (!question || !answer) {
    return NextResponse.json(
      { error: 'Missing question or answer.' },
      { status: 400 }
    );
  }

  try {
    const client = getClient();
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      temperature: 0.3,
      system: ANALYZE_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Question: ${question}\nAnswer: ${answer}\nPrior themes so far: ${
            priorThemes.length ? priorThemes.join(', ') : '(none)'
          }\n\nReturn the JSON now.`,
        },
      ],
    });

    const parsed = safeParse(textOf(msg));
    return NextResponse.json(parsed);
  } catch (err) {
    // Fail soft — the app stays usable even without analysis.
    const fallback: AnalyzeResponseBody = {
      themes: [],
      certaintyScore: 0.5,
      contradictions: [],
      resistance: [],
    };
    const message = err instanceof Error ? err.message : 'Unknown error.';
    return NextResponse.json(
      { ...fallback, _warning: message },
      { status: 200 }
    );
  }
}

function safeParse(text: string): AnalyzeResponseBody {
  const empty: AnalyzeResponseBody = {
    themes: [],
    certaintyScore: 0.5,
    contradictions: [],
    resistance: [],
  };
  if (!text) return empty;
  // Strip possible code fences the model might add despite instructions.
  const cleaned = text
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  // Grab the first { ... } block.
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < 0 || end <= start) return empty;
  try {
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    return {
      themes: sanitizeStringArray(obj.themes, 4),
      certaintyScore: clamp01(Number(obj.certaintyScore)),
      contradictions: sanitizeStringArray(obj.contradictions, 3),
      resistance: sanitizeStringArray(obj.resistance, 3),
    };
  } catch {
    return empty;
  }
}

function sanitizeStringArray(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0 && s.length <= 48)
    .slice(0, max);
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
