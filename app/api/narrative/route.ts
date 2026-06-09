import { NextResponse } from 'next/server';
import { getClient, MODEL, textOf } from '@/lib/anthropic';
import { profileName } from '@/lib/humandesign/interpretations';
import { ageInYears, positionInCycles } from '@/lib/cycles';
import { LIFE_STATIONS } from '@/lib/lifeStations';
import { currentChapter } from '@/lib/lifeChapters';
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

  const hd = bp.humanDesign;
  const n = bp.natal;
  const channels = hd.activeChannels.map(([a, b]) => `${a}-${b}`).join(', ') || 'no defined channels';
  const centers = hd.definedCenters.length === 0
    ? 'no defined centers (Reflector)'
    : hd.definedCenters.map((c) => c === 'SolarPlexus' ? 'Solar Plexus' : c).join(', ');

  const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  const ascSign = n.asc !== null ? SIGNS[Math.floor(((n.asc % 360) + 360) % 360 / 30)] : null;

  // Where the reader is RIGHT NOW in their life cycles.
  const age = ageInYears(bp.birth.iso);
  const positions = positionInCycles(age);
  const rising = positions.filter((p) => p.positive).length;
  const cyclesLine = positions
    .map((p) => `${p.cycle.label} ${p.positive ? '↑' : '↓'}`)
    .join(', ');

  // Nearest named life-station within ±3y.
  let nearestStation: typeof LIFE_STATIONS[number] | null = null;
  let nearestDistance = Infinity;
  for (const s of LIFE_STATIONS) {
    const d = Math.abs(age - s.age);
    if (d < 3 && d < nearestDistance) {
      nearestStation = s;
      nearestDistance = d;
    }
  }
  const stationLine = nearestStation
    ? `\nThey are currently within ${nearestDistance.toFixed(1)}y of "${nearestStation.label}" (age ${nearestStation.age}): ${nearestStation.description}`
    : '';
  const chapter = currentChapter(age);
  const chapterLine = chapter ? `\nLife chapter: '${chapter.label}' (ages ${chapter.startAge}–${chapter.endAge}). ${chapter.description}` : '';

  const prompt = `Write a 90-130 word standalone summary of this person's chart in a direct, dry, slightly clinical, slightly mystical voice. Anchor in the specific combination of:

- Sun in ${n.sun.sign} (gate ${n.sun.gate}.${n.sun.line})
- Moon in ${n.moon.sign}
${ascSign ? `- Rising sign: ${ascSign}` : '- (birth time unknown — soft profile)'}
- Type: ${hd.type}
- Strategy: ${hd.strategy}
- Inner-decision style: ${hd.authority}
- Profile: ${hd.profile} (${profileName(hd.profile)})
- Definition: ${hd.definition}
- Defined centers: ${centers}
- Active channels: ${channels}
- Current age: ${age.toFixed(1)}y; ${rising} cycles rising / ${positions.length - rising} descending. ${cyclesLine}${stationLine}${chapterLine}

Speak to them in second person. Name the texture this combination creates — not a list of attributes but the actual feel of being them. If a named life-station applies, acknowledge it in one phrase. End with a sentence that lands like a quiet observation, not a command or pep talk.

Hard bans: do NOT name the system ("Human Design", "HD", "bodygraph"), do NOT use "the universe", "embrace", "manifest", "abundance", "lean into", "you are special", "your gifts", no emojis, no exclamation points, no rhetorical questions. Never compare this reading to other apps. No phrase that could appear in an airport-bookstore self-help book. Output only the paragraph.`;

  try {
    const client = getClient();
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      temperature: 0.85,
      messages: [{ role: 'user', content: prompt }],
    });
    return withCors(NextResponse.json({
      paragraph: textOf(msg),
      generatedAt: new Date().toISOString(),
    }), req);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return withCors(NextResponse.json({ error: message }, { status: 500 }), req);
  }
}
