import { NextResponse } from 'next/server';
import { todaysTransits, pickTopAspects, currentRetrogrades } from '@/lib/astrology/transits';
import { userTransits } from '@/lib/humandesign/transitGates';
import { AUTHORITY_DESCRIPTIONS } from '@/lib/humandesign/interpretations';
import { ageInYears, polarityFlips } from '@/lib/cycles';
import { currentChapter } from '@/lib/lifeChapters';
import { handlePreflight, withCors } from '@/lib/cors';
import {
  composePrompt,
  callLLM,
  llmErrorResponse,
  splitTakeaway,
  streamLLMResponse,
  rateLimit,
  readBoundedBody,
  isWellFormedBlueprint,
} from '@/lib/llm';
import { cacheKey, getCached, setCached, TTL } from '@/lib/llmCache';
import type { Blueprint, DailyReport } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(req: Request) {
  return handlePreflight(req);
}

export async function POST(req: Request) {
  const limited = rateLimit(req, 'daily');
  if (limited) return limited;

  const parsed = await readBoundedBody<{
    blueprint?: Blueprint;
    localDate?: string;
    /** Recent paragraphs the client has shown this user, oldest-first
     *  or newest-first either way — we cap and trim server-side. Used
     *  for anti-repetition. */
    recentParagraphs?: string[];
  }>(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;
  const bp = body.blueprint;
  if (!isWellFormedBlueprint(bp) || !bp.natal || !bp.humanDesign) {
    return withCors(NextResponse.json({ error: 'missing blueprint' }, { status: 400 }), req);
  }
  const recentParagraphs = Array.isArray(body.recentParagraphs)
    ? body.recentParagraphs.filter((p): p is string => typeof p === 'string').slice(0, 5)
    : [];

  const now = new Date();
  // Use the client's local date when provided so the daily caches align
  // with what the user calls "today" in their timezone.
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
      (a) => `- transiting ${a.transitPlanet} ${a.aspect} natal ${a.natalPlanet} (orb ${a.orb.toFixed(2)}°)`,
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

  const personBody = [
    `- Sun in ${bp.natal.sun.sign} (gate ${bp.natal.sun.gate}.${bp.natal.sun.line})`,
    `- Moon in ${bp.natal.moon.sign}`,
    bp.natal.asc != null ? `- Rising sign: ${signFromLon(bp.natal.asc)}` : '- (birth time unknown — no rising)',
    `- Type: ${bp.humanDesign.type} · Profile: ${bp.humanDesign.profile}`,
    `- Inner-decision style (translate the SPIRIT into how they should approach decisions today — do NOT use the labels "authority", "Sacral", "Splenic", "Emotional", "Ego", "Self-projected", "Mental", or "Lunar" verbatim): ${AUTHORITY_DESCRIPTIONS[bp.humanDesign.authority]}`,
  ].join('\n');

  const todayBody = [
    `Tightest transits to their natal chart:`,
    transitLines || '- (a quiet day for major aspects)',
    litLines ? `\nTransits hitting their natal gates:\n${litLines}` : '',
    completeLines ? `\nChannels temporarily completing for them today:\n${completeLines}` : '',
    retros.length ? `\nCurrently retrograde: ${retros.join(', ')}` : '',
    recentFlip ? `\nPolarity: ${recentFlip.cycle.label} flipped ${Math.round(recentFlip.daysSinceStart)} days ago to ${recentFlip.positive ? 'rising' : 'descending'}.` : '',
    chapter ? `\nLife chapter: in '${chapter.label}' (ages ${chapter.startAge}–${chapter.endAge}). ${chapter.description}` : '',
  ].filter(Boolean).join('');

  const prompt = composePrompt({
    task: [
      "Write the day's reading for a single person.",
      "",
      "OUTPUT FORMAT — follow EXACTLY:",
      "Line 1: a single sentence of 6 to 14 words capturing the heart of today. Lowercase, voice-matched, no quotation marks, no prefix like 'TAKEAWAY:'.",
      "Line 2: blank.",
      "Then: one paragraph of 90 to 130 words.",
      "Nothing else — no preamble, no header.",
    ].join('\n'),
    sections: [
      { header: "THE PERSON'S CHART (chart numbers only; do not name the system in your output)", body: personBody },
      { header: 'TODAY', body: todayBody },
    ],
    rules: [
      'Anchor the paragraph in at least one of the specific signals above (a tight transit, a lit natal gate, or a temporarily-complete channel). Refer to a gate or channel by its number only ("gate 24", "the 43-23 channel") and translate it plainly into what it MEANS for today — name the actual texture of the day, not the category. "A short fuse this afternoon" is good; "today brings energy" is not.',
      'Name one concrete, mundane experience this reader is likely to recognise — a moment they could screenshot from their own day. The reader should feel "how did it know that" — that comes from naming a specific behavior, not a trait.',
      'Include exactly one observation that quietly invites the reader to question something they take for granted about their own psyche — a belief about themselves, a pattern they\'ve stopped noticing, a story they\'ve been telling themselves about WHY they do a thing. The good version is specific to THIS chart; the bad version is generic.',
      'End with a quiet observation — not a command, not a question, not a forecast.',
    ],
    recentParagraphs,
  });

  // Server-side cache check. Keyed by blueprint + local date only —
  // NOT by recentParagraphs, because history shifts on every visit
  // (a new daily reading enters it) and including it would defeat
  // caching entirely. Anti-repetition still applies to the first
  // generation of the day; subsequent visits return that same
  // first paragraph from cache, which is the right model for "today's
  // reading" (the daily is supposed to be stable through the day).
  const ckey = cacheKey('daily', { bp, date: today });
  const cached = await getCached<DailyReport>(ckey);
  if (cached) {
    return withCors(NextResponse.json(cached), req);
  }

  // ?stream=1 → server-sent-events stream so the client renders the
  // paragraph word-by-word as it's produced. Default to the existing
  // non-streaming JSON path so the service worker's body-hash cache
  // (and any other consumer that wants a plain JSON object) keeps
  // working unchanged.
  const wantsStream = new URL(req.url).searchParams.get('stream') === '1';
  if (wantsStream) {
    return streamLLMResponse(req, {
      prompt,
      maxTokens: 450,
      temperature: 0.8,
      meta: { date: today, transits: top },
      splitTakeaway: true,
      // Persist the finished paragraph so the next request with the
      // same blueprint + date returns instantly from KV.
      onComplete: ({ takeaway, paragraph }) => {
        const report: DailyReport = { paragraph, takeaway, date: today, transits: top };
        void setCached(ckey, report, TTL.daily);
      },
    });
  }

  let raw: string;
  try {
    raw = await callLLM(prompt, { maxTokens: 450, temperature: 0.8 });
  } catch (e: unknown) {
    return llmErrorResponse(req, e, 'api/daily');
  }

  const { takeaway, paragraph } = splitTakeaway(raw);
  const report: DailyReport = { paragraph, takeaway, date: today, transits: top };
  void setCached(ckey, report, TTL.daily);
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
