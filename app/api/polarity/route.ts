import { NextResponse } from 'next/server';
import { ageInYears, positionInCycles, polarityFlips } from '@/lib/cycles';
import { LIFE_STATIONS } from '@/lib/lifeStations';
import { currentChapter } from '@/lib/lifeChapters';
import { upcomingEventsFeed } from '@/lib/upcomingEvents';
import { getClient, MODEL, textOf } from '@/lib/anthropic';
import { handlePreflight, withCors } from '@/lib/cors';
import type { Blueprint } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(req: Request) {
  return handlePreflight(req);
}

export async function POST(req: Request) {
  let body: { blueprint?: Blueprint };
  try {
    body = (await req.json()) as { blueprint?: Blueprint };
  } catch {
    return withCors(NextResponse.json({ error: 'invalid json' }, { status: 400 }), req);
  }
  const bp = body.blueprint;
  if (!bp) return withCors(NextResponse.json({ error: 'missing blueprint' }, { status: 400 }), req);

  const age = ageInYears(bp.birth.iso);
  const positions = positionInCycles(age);
  const flips = polarityFlips(bp.birth.iso);

  const rising = positions.filter((p) => p.positive);
  const descending = positions.filter((p) => !p.positive);

  // Most recently flipped cycle (smallest daysSinceStart).
  const mostRecent = [...flips].sort((a, b) => a.daysSinceStart - b.daysSinceStart)[0];
  // Next cycle to flip (smallest daysUntilEnd).
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
    ? `\nThe person is currently within ${nearestDistance.toFixed(1)} years of a named life-station: "${nearestStation.label}" at age ${nearestStation.age} (${nearestStation.convergence}). ${nearestStation.description}`
    : '';
  const chapter = currentChapter(age);
  const chapterLine = chapter ? `\nLife chapter: '${chapter.label}' (ages ${chapter.startAge}–${chapter.endAge}). ${chapter.description}` : '';

  // Compact summary of the next 12 months' major events (skip flips —
  // they show in the recent/next-flip lines already).
  const upcoming = upcomingEventsFeed(bp.birth.iso, new Date(), {
    horizonYears: 1,
    includeFlips: false,
  });
  const upcomingLine = upcoming.length > 0
    ? `\nKey events inside the next 12 months:\n` + upcoming.slice(0, 5).map((e) => `- ${e.title} (${e.detail}) in ${Math.round(e.daysAhead)}d`).join('\n')
    : '';

  const prompt = `Interpret the following polarity stack for a single person, in a dry, slightly clinical, slightly mystical voice. Address the reader in the second person.

${lines}

${rising.length} cycles are rising · ${descending.length} are descending.
Most recent flip: ${mostRecent?.cycle.label ?? 'none'} (${mostRecent ? `${Math.round(mostRecent.daysSinceStart)} days ago to ${mostRecent.positive ? 'rising' : 'descending'}` : ''}).
Next flip: ${nextUp?.cycle.label ?? 'none'} (${nextUp ? `in ${Math.round(nextUp.daysUntilEnd)} days to ${nextUp.positive ? 'descending' : 'rising'}` : ''}).
${stationLine}${chapterLine}${upcomingLine}

Write one paragraph, 80-120 words. Name what the overall stack tends to feel like. If a life-station is named above, lean on it. Otherwise lean on the most recent flip. End on a sentence that lands like a quiet observation.

Hard bans: do NOT name the system ("Human Design", "HD", "bodygraph"), do NOT use "the universe", "embrace", "manifest", "abundance", "lean into", no emojis, no exclamation points, no rhetorical questions, no bullet points. Never compare this reading to other apps or to typical horoscopes. No phrase that could appear in an airport-bookstore self-help book. Output only the paragraph.`;

  try {
    const client = getClient();
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      temperature: 0.75,
      messages: [{ role: 'user', content: prompt }],
    });
    return withCors(NextResponse.json({
      paragraph: textOf(msg),
      rising: rising.length,
      descending: descending.length,
      generatedAt: new Date().toISOString(),
    }), req);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return withCors(NextResponse.json({ error: message }, { status: 500 }), req);
  }
}
