import { NextResponse } from 'next/server';
import { profileName } from '@/lib/humandesign/interpretations';
import { ageInYears, positionInCycles } from '@/lib/cycles';
import { LIFE_STATIONS } from '@/lib/lifeStations';
import { currentChapter } from '@/lib/lifeChapters';
import { handlePreflight, withCors } from '@/lib/cors';
import {
  composePrompt,
  callLLM,
  llmErrorResponse,
  streamLLMResponse,
  rateLimit,
  readBoundedBody,
  isWellFormedBlueprint,
} from '@/lib/llm';
import { cacheKey, getCached, setCached, TTL } from '@/lib/llmCache';
import type { Blueprint } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(req: Request) {
  return handlePreflight(req);
}

export async function POST(req: Request) {
  const limited = rateLimit(req, 'narrative');
  if (limited) return limited;

  const parsed = await readBoundedBody<{ blueprint?: Blueprint }>(req);
  if (!parsed.ok) return parsed.response;
  const bp = parsed.body.blueprint;
  if (!isWellFormedBlueprint(bp)) {
    return withCors(NextResponse.json({ error: 'missing blueprint' }, { status: 400 }), req);
  }

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
  const cyclesLine = positions.map((p) => `${p.cycle.label} ${p.positive ? '↑' : '↓'}`).join(', ');

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
    ? `They are currently within ${nearestDistance.toFixed(1)}y of "${nearestStation.label}" (age ${nearestStation.age}): ${nearestStation.description}`
    : '';
  const chapter = currentChapter(age);
  const chapterLine = chapter ? `Life chapter: '${chapter.label}' (ages ${chapter.startAge}–${chapter.endAge}). ${chapter.description}` : '';

  const chartBody = [
    `- Sun in ${n.sun.sign} (gate ${n.sun.gate}.${n.sun.line})`,
    `- Moon in ${n.moon.sign}`,
    ascSign ? `- Rising sign: ${ascSign}` : '- (birth time unknown — soft profile)',
    `- Type: ${hd.type}`,
    `- Strategy: ${hd.strategy}`,
    `- Inner-decision style: ${hd.authority}`,
    `- Profile: ${hd.profile} (${profileName(hd.profile)})`,
    `- Definition: ${hd.definition}`,
    `- Defined centers: ${centers}`,
    `- Active channels: ${channels}`,
    `- Current age: ${age.toFixed(1)}y; ${rising} cycles rising / ${positions.length - rising} descending. ${cyclesLine}`,
    stationLine,
    chapterLine,
  ].filter(Boolean).join('\n');

  const prompt = composePrompt({
    task: "Write a one-time standalone summary of this person's chart. Output one paragraph of 90 to 130 words. Output only the paragraph — no preamble, no header, no quotation marks.",
    sections: [{ header: 'THE CHART', body: chartBody }],
    rules: [
      'Name the texture this specific combination creates — not a list of attributes, the actual feel of being them.',
      'Include exactly one observation that quietly invites the reader to question something they take for granted about their own psyche — a belief about who they are, a pattern they\'ve stopped noticing, a story they\'ve been telling about themselves that this chart suggests might be slightly off.',
      'If a named life-station applies, acknowledge it in one phrase.',
      'End on a quiet observation, not a command, not a pep talk.',
    ],
  });

  // Chart text is keyed only by the blueprint — never changes once
  // birth data is entered, so cache for a long time.
  const ckey = cacheKey('narrative', { bp });
  const cached = await getCached<{ paragraph: string; generatedAt: string }>(ckey);
  if (cached) {
    return withCors(NextResponse.json(cached), req);
  }

  if (new URL(req.url).searchParams.get('stream') === '1') {
    return streamLLMResponse(req, {
      prompt,
      maxTokens: 400,
      temperature: 0.85,
      meta: { generatedAt: new Date().toISOString() },
      splitTakeaway: false,
      onComplete: ({ paragraph }) => {
        void setCached(ckey, { paragraph, generatedAt: new Date().toISOString() }, TTL.narrative);
      },
    });
  }

  try {
    const paragraph = await callLLM(prompt, { maxTokens: 400, temperature: 0.85 });
    void setCached(ckey, { paragraph, generatedAt: new Date().toISOString() }, TTL.narrative);
    return withCors(NextResponse.json({
      paragraph,
      generatedAt: new Date().toISOString(),
    }), req);
  } catch (e: unknown) {
    return llmErrorResponse(req, e, 'api/narrative');
  }
}

