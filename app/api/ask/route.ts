import { NextResponse } from 'next/server';
import { todaysTransits, pickTopAspects } from '@/lib/astrology/transits';
import { userTransits } from '@/lib/humandesign/transitGates';
import { AUTHORITY_DESCRIPTIONS } from '@/lib/humandesign/interpretations';
import { ageInYears, polarityFlips } from '@/lib/cycles';
import { currentChapter } from '@/lib/lifeChapters';
import { getClient, MODEL, textOf } from '@/lib/anthropic';
import { handlePreflight, withCors } from '@/lib/cors';
import { VOICE_SPEC } from '@/lib/voice';
import type { Blueprint } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(req: Request) {
  return handlePreflight(req);
}

const QUESTION_MAX = 240;

/**
 * "Ask the day" — the user types a short context line (max 240 chars)
 * and gets back one paragraph from the lens of today's transits to their
 * chart. NOT an oracle or advice column: deliberately bounded by the
 * VOICE_SPEC's anti-prescriptive rules.
 *
 * Body:
 *   { blueprint: Blueprint, question: string }
 */
export async function POST(req: Request) {
  let body: { blueprint?: Blueprint; question?: string };
  try {
    body = (await req.json()) as { blueprint?: Blueprint; question?: string };
  } catch {
    return withCors(NextResponse.json({ error: 'invalid json' }, { status: 400 }), req);
  }

  const bp = body.blueprint;
  if (!bp || !bp.natal || !bp.humanDesign) {
    return withCors(NextResponse.json({ error: 'missing blueprint' }, { status: 400 }), req);
  }
  const question = typeof body.question === 'string' ? body.question.trim() : '';
  if (!question) {
    return withCors(NextResponse.json({ error: 'missing question' }, { status: 400 }), req);
  }
  if (question.length > QUESTION_MAX) {
    return withCors(
      NextResponse.json({ error: `question too long (max ${QUESTION_MAX} chars)` }, { status: 400 }),
      req,
    );
  }

  const now = new Date();
  const { aspects } = todaysTransits(bp.natal);
  const top = pickTopAspects(aspects, 3);
  const hd = userTransits(bp, now);
  const recentFlip = polarityFlips(bp.birth.iso, now)
    .filter((f) => f.daysSinceStart <= 14)
    .sort((a, b) => a.daysSinceStart - b.daysSinceStart)[0] ?? null;
  const chapter = currentChapter(ageInYears(bp.birth.iso, now));

  const transitLines = top
    .map((a) => `- transiting ${a.transitPlanet} ${a.aspect} natal ${a.natalPlanet} (orb ${a.orb.toFixed(2)}°)`)
    .join('\n');
  const litLines = hd.lit
    .map((l) => `- transiting ${l.planet} is back in your natal gate ${l.gate}.${l.line}`)
    .join('\n');

  const prompt = `${VOICE_SPEC}

TASK
The reader has typed one short context line. Respond with one paragraph of 80 to 120 words from the lens of today's transits to their chart. Output only the paragraph — no preamble, no header, no quotation marks.

THE PERSON'S CHART (chart numbers only; do not name the system)
- Sun in ${bp.natal.sun.sign} (gate ${bp.natal.sun.gate}.${bp.natal.sun.line})
- Moon in ${bp.natal.moon.sign}
- Type: ${bp.humanDesign.type} · Profile: ${bp.humanDesign.profile}
- Inner-decision style (translate into how they should approach decisions today — do NOT use the labels "authority", "Sacral", "Splenic", "Emotional", "Ego", "Self-projected", "Mental", or "Lunar" verbatim): ${AUTHORITY_DESCRIPTIONS[bp.humanDesign.authority]}

TODAY
Tightest transits:
${transitLines || '- (a quiet day for major aspects)'}
${litLines ? `\nTransits hitting natal gates:\n${litLines}` : ''}${recentFlip ? `\nPolarity: ${recentFlip.cycle.label} flipped ${Math.round(recentFlip.daysSinceStart)} days ago to ${recentFlip.positive ? 'rising' : 'descending'}.` : ''}${chapter ? `\nLife chapter: '${chapter.label}' (ages ${chapter.startAge}–${chapter.endAge}). ${chapter.description}` : ''}

WHAT THEY ASKED
"${question.replace(/"/g, "'")}"

WHAT TO DO
1. Reflect what they wrote back through the lens of one or two of the day's specific signals above. Do not pretend to know things you can't (their relationships, finances, medical situation). Don't decide for them.
2. Include exactly one observation that quietly invites them to question a story they're telling themselves about the thing they asked about.
3. End with a quiet observation, not a command, not a question, not a prediction.
4. Do not mention astrology, gates, channels, transits, or "Human Design" by name in the paragraph. Just describe what's lit.`;

  let paragraph: string;
  try {
    const client = getClient();
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      temperature: 0.85,
      messages: [{ role: 'user', content: prompt }],
    });
    paragraph = textOf(msg);
  } catch (e: unknown) {
    console.error('[api/ask] model call failed:', e);
    const isOverload = e instanceof Error && /overloaded|rate|429/i.test(e.message);
    const isAuth = e instanceof Error && /api[_ ]key|unauthorized|401/i.test(e.message);
    const userMessage = isAuth
      ? 'reading service not configured'
      : isOverload
        ? 'reading service is busy'
        : 'reading service failed';
    return withCors(NextResponse.json({ error: userMessage }, { status: 500 }), req);
  }

  return withCors(NextResponse.json({ paragraph }), req);
}
