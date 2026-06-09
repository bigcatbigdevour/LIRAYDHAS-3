import { NextResponse } from 'next/server';
import { todaysTransits, pickTopAspects, currentRetrogrades } from '@/lib/astrology/transits';
import { userTransits } from '@/lib/humandesign/transitGates';
import { AUTHORITY_DESCRIPTIONS } from '@/lib/humandesign/interpretations';
import { ageInYears, polarityFlips } from '@/lib/cycles';
import { currentChapter } from '@/lib/lifeChapters';
import { getClient, MODEL, textOf } from '@/lib/anthropic';
import { handlePreflight, withCors } from '@/lib/cors';
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

  const prompt = `You are writing a daily reading for a person with this blueprint:
- Sun in ${bp.natal.sun.sign} (gate ${bp.natal.sun.gate}.${bp.natal.sun.line})
- Moon in ${bp.natal.moon.sign}
${bp.natal.asc != null ? `- Rising sign: ${signFromLon(bp.natal.asc)}` : '- (birth time unknown — no rising)'}
- Type: ${bp.humanDesign.type} · Profile: ${bp.humanDesign.profile} · Inner-decision style: ${bp.humanDesign.authority}

Today's tightest transits to their natal chart:
${transitLines || '- (a quiet day for major aspects)'}

${litLines ? `Transits hitting their personal natal gates:\n${litLines}\n` : ''}${completeLines ? `Channels temporarily completing for them today:\n${completeLines}\n` : ''}${retros.length ? `Currently retrograde: ${retros.join(', ')}\n` : ''}${recentFlip ? `Polarity note: ${recentFlip.cycle.label} flipped ${Math.round(recentFlip.daysSinceStart)} days ago to ${recentFlip.positive ? 'rising' : 'descending'}.\n` : ''}${chapter ? `Life chapter: this person is in '${chapter.label}' (ages ${chapter.startAge}–${chapter.endAge}). ${chapter.description}\n` : ''}Decision-style guidance for this reader (translate the SPIRIT of this into how they should approach decisions today; do NOT use the labels "authority", "Sacral", "Splenic", "Emotional", "Ego", "Self-projected", "Mental", or "Lunar" verbatim): ${AUTHORITY_DESCRIPTIONS[bp.humanDesign.authority]}

Write one paragraph, 90–130 words. Voice is direct, slightly clinical, slightly mystical, dry. Speaks plainly to the reader in the second person. Anchor in at least one of the user-specific signals above (a tight transit OR a lit natal gate OR a temporarily-complete channel). Refer to the relevant gate or channel by its number only ("gate 24", "the 43-23 channel"), translated plainly into what it MEANS for today — never as specialized jargon.

Hard bans: do NOT name the system ("Human Design", "HD", "bodygraph", "rave"), do NOT use the words "the universe wants you to", "embrace", "manifest", "abundance", "lean into", "trust the process", no emojis, no exclamation points, no rhetorical questions. Never compare this reading to other apps or to typical horoscopes. No phrase that could appear in an airport-bookstore self-help book.

Naming one mundane, concrete thing they should pay attention to today is good. End with a sentence that lands like a quiet observation, not a command. Output only the paragraph — no preamble, no quotation marks.`;

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
    const message = e instanceof Error ? e.message : 'unknown error';
    return withCors(NextResponse.json({ error: message }, { status: 500 }), req);
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
