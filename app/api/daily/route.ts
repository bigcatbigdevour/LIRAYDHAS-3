import { NextResponse } from 'next/server';
import { todaysTransits, pickTopAspects, currentRetrogrades } from '@/lib/astrology/transits';
import { userTransits } from '@/lib/humandesign/transitGates';
import { AUTHORITY_DESCRIPTIONS } from '@/lib/humandesign/interpretations';
import { ageInYears, polarityFlips } from '@/lib/cycles';
import { currentChapter } from '@/lib/lifeChapters';
import { getClient, MODEL, textOf } from '@/lib/anthropic';
import { handlePreflight, withCors } from '@/lib/cors';
import { VOICE_SPEC } from '@/lib/voice';
import type { Blueprint, DailyReport } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(req: Request) {
  return handlePreflight(req);
}

export async function POST(req: Request) {
  let body: { blueprint?: Blueprint; localDate?: string };
  try {
    body = (await req.json()) as { blueprint?: Blueprint; localDate?: string };
  } catch {
    return withCors(NextResponse.json({ error: 'invalid json' }, { status: 400 }), req);
  }
  const bp = body.blueprint;
  if (!bp || !bp.natal || !bp.humanDesign) {
    return withCors(NextResponse.json({ error: 'missing blueprint' }, { status: 400 }), req);
  }

  const now = new Date();
  // Use the client's local date when provided so the daily caches align with
  // what the user calls "today" in their timezone.
  const today = body.localDate ?? now.toISOString().slice(0, 10);
  const { aspects } = todaysTransits(bp.natal);
  const top = pickTopAspects(aspects, 3);
  const hd = userTransits(bp, now);
  const retros = currentRetrogrades(now);
  // Most recently flipped polarity cycle, if within 14 days.
  const recentFlip = polarityFlips(bp.birth.iso, now)
    .filter((f) => f.daysSinceStart <= 14)
    .sort((a, b) => a.daysSinceStart - b.daysSinceStart)[0] ?? null;
  const chapter = currentChapter(ageInYears(bp.birth.iso, now));

  const transitLines = top
    .map(
      (a) =>
        `- transiting ${a.transitPlanet} ${a.aspect} natal ${a.natalPlanet} (orb ${a.orb.toFixed(2)}°)`,
    )
    .join('\n');

  const litLines = hd.lit
    .map((l) => `- transiting ${l.planet} is back in your natal gate ${l.gate}.${l.line}`)
    .join('\n');

  const completeLines = hd.completes
    .map(
      (c) =>
        `- the ${c.name} channel (gates ${c.channel[0]}–${c.channel[1]}) temporarily completes: ${c.transitPlanet} is in ${c.transitGate}, you have ${c.natalGate} natally`,
    )
    .join('\n');

  const prompt = `${VOICE_SPEC}

TASK
Write the day's reading for a single person. Output one paragraph of 90 to 130 words. Output only the paragraph — no preamble, no header, no quotation marks.

THE PERSON'S CHART (chart numbers only; do not name the system in your output)
- Sun in ${bp.natal.sun.sign} (gate ${bp.natal.sun.gate}.${bp.natal.sun.line})
- Moon in ${bp.natal.moon.sign}
${bp.natal.asc != null ? `- Rising sign: ${signFromLon(bp.natal.asc)}` : '- (birth time unknown — no rising)'}
- Type: ${bp.humanDesign.type} · Profile: ${bp.humanDesign.profile}
- Inner-decision style (translate the SPIRIT into how they should approach decisions today — do NOT use the labels "authority", "Sacral", "Splenic", "Emotional", "Ego", "Self-projected", "Mental", or "Lunar" verbatim): ${AUTHORITY_DESCRIPTIONS[bp.humanDesign.authority]}

TODAY
Tightest transits to their natal chart:
${transitLines || '- (a quiet day for major aspects)'}
${litLines ? `\nTransits hitting their natal gates:\n${litLines}` : ''}${completeLines ? `\nChannels temporarily completing for them today:\n${completeLines}` : ''}${retros.length ? `\nCurrently retrograde: ${retros.join(', ')}` : ''}${recentFlip ? `\nPolarity: ${recentFlip.cycle.label} flipped ${Math.round(recentFlip.daysSinceStart)} days ago to ${recentFlip.positive ? 'rising' : 'descending'}.` : ''}${chapter ? `\nLife chapter: in '${chapter.label}' (ages ${chapter.startAge}–${chapter.endAge}). ${chapter.description}` : ''}

WHAT TO INCLUDE IN THE PARAGRAPH
1. Anchor in at least one of the specific signals above (a tight transit, a lit natal gate, or a temporarily-complete channel). Refer to a gate or channel by its number only ("gate 24", "the 43-23 channel") and translate it plainly into what it MEANS for today.
2. Include exactly one observation that quietly invites the reader to question something they take for granted about their own psyche — a belief about themselves, a pattern they've stopped noticing, a story they've been telling themselves.
3. Naming one mundane, concrete thing they should pay attention to today is welcome.
4. End with a quiet observation — not a command, not a question.`;

  let paragraph: string;
  try {
    const client = getClient();
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      temperature: 0.8,
      messages: [{ role: 'user', content: prompt }],
    });
    paragraph = textOf(msg);
  } catch (e: unknown) {
    // Log the real message server-side for debugging, but return a
    // generic error to the client. Anthropic exceptions can include
    // request IDs, model IDs, and stack frames that don't belong in
    // a user-visible Network panel.
    console.error('[api/daily] model call failed:', e);
    const isOverload = e instanceof Error && /overloaded|rate|429/i.test(e.message);
    const isAuth = e instanceof Error && /api[_ ]key|unauthorized|401/i.test(e.message);
    const userMessage = isAuth
      ? 'reading service not configured'
      : isOverload
        ? 'reading service is busy'
        : 'reading service failed';
    return withCors(NextResponse.json({ error: userMessage }, { status: 500 }), req);
  }

  const report: DailyReport = {
    paragraph,
    date: today,
    transits: top,
  };
  return withCors(NextResponse.json(report), req);
}

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];
function signFromLon(lon: number): string {
  const n = ((lon % 360) + 360) % 360;
  return SIGNS[Math.floor(n / 30)];
}
