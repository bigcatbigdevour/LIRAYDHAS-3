import { NextResponse } from 'next/server';
import { todaysTransits, pickTopAspects } from '@/lib/astrology/transits';
import { getClient, MODEL, textOf } from '@/lib/anthropic';
import type { Blueprint, DailyReport } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { blueprint?: Blueprint };
  try {
    body = (await req.json()) as { blueprint?: Blueprint };
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const bp = body.blueprint;
  if (!bp || !bp.natal || !bp.humanDesign) {
    return NextResponse.json({ error: 'missing blueprint' }, { status: 400 });
  }

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const { aspects } = todaysTransits(bp.natal);
  const top = pickTopAspects(aspects, 3);

  const transitLines = top
    .map(
      (a) =>
        `- transiting ${a.transitPlanet} ${a.aspect} natal ${a.natalPlanet} (orb ${a.orb.toFixed(2)}°)`,
    )
    .join('\n');

  const prompt = `You are writing a daily horoscope for a person with this blueprint:
- Sun in ${bp.natal.sun.sign} (${bp.natal.sun.gate}.${bp.natal.sun.line})
- Moon in ${bp.natal.moon.sign}
${bp.natal.asc != null ? `- Rising sign: ${signFromLon(bp.natal.asc)}` : '- (birth time unknown — no rising)'}
- Human Design: ${bp.humanDesign.type}, ${bp.humanDesign.profile}, ${bp.humanDesign.authority} authority

Today's tightest transits to their natal chart:
${transitLines || '- (a quiet day for major aspects)'}

Write one paragraph, 90–130 words. The voice is Co-Star: direct, slightly clinical, slightly mystical, dry. Speaks plainly. Names one real thing they should pay attention to today, anchored in the transits above. No "the universe wants you to". No emojis. No exclamation points. No second-person pep talk. End with a sentence that lands like a quiet observation, not a command. Output only the paragraph — no preamble, no quotation marks.`;

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
