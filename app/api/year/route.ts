import { NextResponse } from 'next/server';
import { ageInYears, polarityFlips, upcomingReturns } from '@/lib/cycles';
import { currentChapter } from '@/lib/lifeChapters';
import { upcomingEventsFeed } from '@/lib/upcomingEvents';
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
import type { Blueprint, YearReading } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(req: Request) {
  return handlePreflight(req);
}

export async function POST(req: Request) {
  const limited = rateLimit(req, 'year');
  if (limited) return limited;

  const parsed = await readBoundedBody<{ blueprint?: Blueprint }>(req);
  if (!parsed.ok) return parsed.response;
  const bp = parsed.body.blueprint;
  if (!isWellFormedBlueprint(bp)) {
    return withCors(NextResponse.json({ error: 'missing blueprint' }, { status: 400 }), req);
  }

  const now = new Date();
  const age = ageInYears(bp.birth.iso, now);
  const chapter = currentChapter(age);

  const events = upcomingEventsFeed(bp.birth.iso, now, { horizonYears: 1 }).slice(0, 5);
  const returns = upcomingReturns(bp.birth.iso, now).slice(0, 4);
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

  const personBody = [
    `- Currently ${age.toFixed(1)} years old`,
    chapter ? `- In '${chapter.label}' (ages ${chapter.startAge}–${chapter.endAge}). ${chapter.description}` : '',
    `- Type: ${bp.humanDesign.type} · Profile: ${bp.humanDesign.profile}`,
  ].filter(Boolean).join('\n');

  const nextBody = [
    eventLines ? `Upcoming events:\n${eventLines}` : '',
    returnLines ? `Upcoming returns:\n${returnLines}` : '',
    flipLines ? `Upcoming polarity flips (within 60 days):\n${flipLines}` : '',
  ].filter(Boolean).join('\n\n');

  const prompt = composePrompt({
    task: 'Write the "year ahead" reading for a single person. Output one paragraph of 90 to 120 words. Output only the paragraph — no preamble, no header, no quotation marks.',
    sections: [
      { header: 'THE PERSON', body: personBody },
      { header: 'THE NEXT 12 MONTHS', body: nextBody || '- (a quiet year — no major returns, stations, or imminent flips)' },
    ],
    rules: [
      'Anchor in one or two of the SPECIFIC events / returns / flips above. Translate plainly into what the year is about to ask, not what it predicts.',
      'Refer to a cycle by its plain name ("Saturn return", "Chiron return", "the nodal flip") and translate what it MEANS, never as specialized jargon.',
      'Include exactly one observation that quietly invites the reader to question a story they\'ve been telling themselves about the coming year.',
      'End with a quiet observation — not a forecast, not a command, not a question.',
    ],
  });

  // Year reading is keyed by blueprint + current calendar month. Within
  // a month the upcoming events/returns/flips list barely shifts, so a
  // 30-day TTL gives stable repeat hits.
  const monthKey = now.toISOString().slice(0, 7); // YYYY-MM
  const ckey = cacheKey('year', { bp, month: monthKey });
  const cached = await getCached<YearReading>(ckey);
  if (cached) {
    return withCors(NextResponse.json(cached), req);
  }

  if (new URL(req.url).searchParams.get('stream') === '1') {
    return streamLLMResponse(req, {
      prompt,
      maxTokens: 400,
      temperature: 0.8,
      meta: { generatedAt: new Date().toISOString() },
      splitTakeaway: false,
      onComplete: ({ paragraph }) => {
        const reading: YearReading = { paragraph, generatedAt: new Date().toISOString() };
        void setCached(ckey, reading, TTL.year);
      },
    });
  }

  let paragraph: string;
  try {
    paragraph = await callLLM(prompt, { maxTokens: 400, temperature: 0.8 });
  } catch (e: unknown) {
    return llmErrorResponse(req, e, 'api/year');
  }

  const reading: YearReading = {
    paragraph,
    generatedAt: new Date().toISOString(),
  };
  void setCached(ckey, reading, TTL.year);
  return withCors(NextResponse.json(reading), req);
}

