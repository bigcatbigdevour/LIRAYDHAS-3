import { NextResponse } from 'next/server';
import { ageInYears, positionInCycles, polarityFlips } from '@/lib/cycles';
import { LIFE_STATIONS } from '@/lib/lifeStations';
import { currentChapter } from '@/lib/lifeChapters';
import { upcomingEventsFeed } from '@/lib/upcomingEvents';
import { handlePreflight, withCors } from '@/lib/cors';
import { composePrompt, callLLM, llmErrorResponse, rateLimit } from '@/lib/llm';
import type { Blueprint } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(req: Request) {
  return handlePreflight(req);
}

export async function POST(req: Request) {
  const limited = rateLimit(req, 'polarity');
  if (limited) return limited;

  let body: { blueprint?: Blueprint };
  try {
    body = (await req.json()) as { blueprint?: Blueprint };
  } catch {
    return withCors(NextResponse.json({ error: 'invalid json' }, { status: 400 }), req);
  }
  const bp = body.blueprint;
  if (!bp) return withCors(NextResponse.json({ error: 'missing blueprint' }, { status: 400 }), req);
  if (!bp.birth?.iso) {
    return withCors(NextResponse.json({ error: 'invalid blueprint: missing birth' }, { status: 400 }), req);
  }

  const age = ageInYears(bp.birth.iso);
  const positions = positionInCycles(age);
  const flips = polarityFlips(bp.birth.iso);

  const rising = positions.filter((p) => p.positive);
  const descending = positions.filter((p) => !p.positive);

  const mostRecent = [...flips].sort((a, b) => a.daysSinceStart - b.daysSinceStart)[0];
  const nextUp = [...flips].sort((a, b) => a.daysUntilEnd - b.daysUntilEnd)[0];

  // Nearest LifeStation inside ±3y, if any.
  let nearestStation: typeof LIFE_STATIONS[number] | null = null;
  let nearestDistance = Infinity;
  for (const s of LIFE_STATIONS) {
    const d = Math.abs(age - s.age);
    if (d < 3 && d < nearestDistance) {
      nearestStation = s;
      nearestDistance = d;
    }
  }

  const lines = positions
    .map(
      (p) =>
        `- ${p.cycle.label} (${p.cycle.yearLength.toFixed(2)}y period): ${
          p.positive ? 'rising' : 'descending'
        } · ${(p.fraction * 100).toFixed(0)}% through period`,
    )
    .join('\n');

  const stationLine = nearestStation
    ? `The person is currently within ${nearestDistance.toFixed(1)} years of a named life-station: "${nearestStation.label}" at age ${nearestStation.age} (${nearestStation.convergence}). ${nearestStation.description}`
    : '';
  const chapter = currentChapter(age);
  const chapterLine = chapter ? `Life chapter: '${chapter.label}' (ages ${chapter.startAge}–${chapter.endAge}). ${chapter.description}` : '';

  const upcoming = upcomingEventsFeed(bp.birth.iso, new Date(), {
    horizonYears: 1,
    includeFlips: false,
  });
  const upcomingLine = upcoming.length > 0
    ? `Key events inside the next 12 months:\n` + upcoming.slice(0, 5).map((e) => `- ${e.title} (${e.detail}) in ${Math.round(e.daysAhead)}d`).join('\n')
    : '';

  const stackBody = [
    lines,
    '',
    `${rising.length} cycles are rising · ${descending.length} are descending.`,
    `Most recent flip: ${mostRecent?.cycle.label ?? 'none'} (${mostRecent ? `${Math.round(mostRecent.daysSinceStart)} days ago to ${mostRecent.positive ? 'rising' : 'descending'}` : ''}).`,
    `Next flip: ${nextUp?.cycle.label ?? 'none'} (${nextUp ? `in ${Math.round(nextUp.daysUntilEnd)} days to ${nextUp.positive ? 'descending' : 'rising'}` : ''}).`,
    stationLine,
    chapterLine,
    upcomingLine,
  ].filter(Boolean).join('\n');

  const prompt = composePrompt({
    task: "Interpret the reader's current polarity stack. Output one paragraph of 80 to 120 words. Output only the paragraph — no preamble, no header, no quotation marks.",
    sections: [{ header: 'POLARITY STACK', body: stackBody }],
    rules: [
      'Name what the overall stack tends to feel like as a season of life — not as a forecast, as a texture.',
      'If a life-station is named above, lean on it. Otherwise lean on the most recent flip.',
      'Include exactly one observation that quietly invites the reader to question something they take for granted about their own psyche — a belief about themselves, a pattern they\'ve stopped noticing, a story they\'ve been telling themselves about this season.',
      'End on a quiet observation.',
    ],
  });

  try {
    const paragraph = await callLLM(prompt, { maxTokens: 400, temperature: 0.75 });
    return withCors(NextResponse.json({
      paragraph,
      rising: rising.length,
      descending: descending.length,
      generatedAt: new Date().toISOString(),
    }), req);
  } catch (e: unknown) {
    return llmErrorResponse(req, e, 'api/polarity');
  }
}
