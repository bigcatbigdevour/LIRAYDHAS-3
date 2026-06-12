import { NextResponse } from 'next/server';
import { ageInYears, polarityFlips, upcomingReturns } from '@/lib/cycles';
import { currentChapter } from '@/lib/lifeChapters';
import { upcomingEventsFeed } from '@/lib/upcomingEvents';
import { getClient, MODEL, textOf } from '@/lib/anthropic';
import { handlePreflight, withCors } from '@/lib/cors';
import { VOICE_SPEC } from '@/lib/voice';
import type { Blueprint, YearReading } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(req: Request) {
  return handlePreflight(req);
}

/**
 * "Year ahead" paragraph for /year. Given the user's blueprint, builds
 * a short (90–120 word) paragraph anchored on the next 12 months of
 * notable signals: approaching cycle returns, approaching named
 * life-stations, upcoming polarity flips, the chapter they're in or
 * stepping into.
 *
 * Body: { blueprint: Blueprint }
 */
export async function POST(req: Request) {
  let body: { blueprint?: Blueprint };
  try {
    body = (await req.json()) as { blueprint?: Blueprint };
  } catch {
    return withCors(NextResponse.json({ error: 'invalid json' }, { status: 400 }), req);
  }
  const bp = body.blueprint;
  if (!bp || !bp.natal || !bp.humanDesign) {
    return withCors(NextResponse.json({ error: 'missing blueprint' }, { status: 400 }), req);
  }

  const now = new Date();
  const age = ageInYears(bp.birth.iso, now);
  const chapter = currentChapter(age);

  // Top 5 upcoming events (returns + stations) in the next year.
  const events = upcomingEventsFeed(bp.birth.iso, now, { horizonYears: 1 }).slice(0, 5);
  const returns = upcomingReturns(bp.birth.iso, now).slice(0, 4);

  // Flips happening in the next 60 days.
  const flips = polarityFlips(bp.birth.iso, now)
    .filter((f) => f.daysUntilEnd <= 60)
    .sort((a, b) => a.daysUntilEnd - b.daysUntilEnd)
    .slice(0, 3);

  const eventLines = events
    .map((e) => `- ${e.title} · in ~${e.daysAhead < 365 ? `${Math.round(e.daysAhead)} days` : `${(e.daysAhead / 365.25).toFixed(1)} years`} · ${e.detail}`)
    .join('\n');
  const returnLines = returns
    .map((r) => `- ${r.cycle.label} next return at age ${r.ageAtReturn.toFixed(1)} (${r.date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })})`)
    .join('\n');
  const flipLines = flips
    .map((f) => `- ${f.cycle.label} flips to ${f.positive ? 'descending' : 'rising'} in ${Math.round(f.daysUntilEnd)} days`)
    .join('\n');

  const prompt = `${VOICE_SPEC}

TASK
Write the "year ahead" reading for a single person. Output one paragraph of 90 to 120 words. Output only the paragraph — no preamble, no header, no quotation marks.

THE PERSON
- Currently ${age.toFixed(1)} years old
${chapter ? `- In '${chapter.label}' (ages ${chapter.startAge}–${chapter.endAge}). ${chapter.description}` : ''}
- Type: ${bp.humanDesign.type} · Profile: ${bp.humanDesign.profile}

THE NEXT 12 MONTHS
${eventLines ? `Upcoming events:\n${eventLines}\n` : ''}${returnLines ? `\nUpcoming returns:\n${returnLines}\n` : ''}${flipLines ? `\nUpcoming polarity flips (within 60 days):\n${flipLines}\n` : ''}

WHAT TO INCLUDE
1. Anchor in one or two of the SPECIFIC events / returns / flips above. Translate plainly into what the year is about to ask, not what it predicts.
2. Refer to a cycle by its plain name ("Saturn return", "Chiron return", "the nodal flip") and translate what it MEANS, never as specialized jargon.
3. Include exactly one observation that quietly invites the reader to question a story they've been telling themselves about the coming year.
4. End with a quiet observation — not a forecast, not a command, not a question.`;

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
    console.error('[api/year] model call failed:', e);
    const isOverload = e instanceof Error && /overloaded|rate|429/i.test(e.message);
    const isAuth = e instanceof Error && /api[_ ]key|unauthorized|401/i.test(e.message);
    const userMessage = isAuth
      ? 'reading service not configured'
      : isOverload
        ? 'reading service is busy'
        : 'reading service failed';
    return withCors(NextResponse.json({ error: userMessage }, { status: 500 }), req);
  }

  const reading: YearReading = {
    paragraph,
    generatedAt: new Date().toISOString(),
  };
  return withCors(NextResponse.json(reading), req);
}
