import { NextResponse } from 'next/server';
import { todaysTransits, pickTopAspects, currentRetrogrades } from '@/lib/astrology/transits';
import { userTransits } from '@/lib/humandesign/transitGates';
import { getClient, MODEL, textOf } from '@/lib/anthropic';
import type { Blueprint, DailyReport } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { blueprint?: Blueprint; localDate?: string };
  try {
    body = (await req.json()) as { blueprint?: Blueprint; localDate?: string };
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const bp = body.blueprint;
  if (!bp || !bp.natal || !bp.humanDesign) {
    return NextResponse.json({ error: 'missing blueprint' }, { status: 400 });
  }

  const now = new Date();
  // Use the client's local date when provided so the daily caches align with
  // what the user calls "today" in their timezone.
  const today = body.localDate ?? now.toISOString().slice(0, 10);
  const { aspects } = todaysTransits(bp.natal);
  const top = pickTopAspects(aspects, 3);
  const hd = userTransits(bp, now);
  const retros = currentRetrogrades(now);

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

  const prompt = `You are writing a daily horoscope for a person with this blueprint:
- Sun in ${bp.natal.sun.sign} (${bp.natal.sun.gate}.${bp.natal.sun.line})
- Moon in ${bp.natal.moon.sign}
${bp.natal.asc != null ? `- Rising sign: ${signFromLon(bp.natal.asc)}` : '- (birth time unknown — no rising)'}
- Human Design: ${bp.humanDesign.type}, ${bp.humanDesign.profile}, ${bp.humanDesign.authority} authority

Today's tightest transits to their natal chart:
${transitLines || '- (a quiet day for major aspects)'}

${litLines ? `Transits hitting their personal natal gates:\n${litLines}\n` : ''}${completeLines ? `Channels temporarily completing for them today:\n${completeLines}\n` : ''}${retros.length ? `Currently retrograde: ${retros.join(', ')}\n` : ''}
Write one paragraph, 90–130 words. The voice is Co-Star: direct, slightly clinical, slightly mystical, dry. Speaks plainly. Anchor in at least one of the user-specific signals above (a tight transit OR a lit natal gate OR a temporarily-complete channel). Reference at most one piece of HD jargon (a channel or center, no more) and translate it plainly.

Hard bans: no "the universe wants you to", no "embrace", no "manifest", no "abundance", no "lean into", no "trust the process", no emojis, no exclamation points, no rhetorical questions. No phrase that could appear in an airport-bookstore self-help book.

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
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const report: DailyReport = {
    paragraph,
    date: today,
    transits: top,
  };
  return NextResponse.json(report);
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
