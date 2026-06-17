import { NextResponse } from 'next/server';
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
import {
  computeSynastryAspects,
  computeElectricChannels,
  computeLifeStageDiff,
  aspectLabel,
  electricChannelLabel,
} from '@/lib/synastry';
import type { Blueprint, SynastryReading } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(req: Request) {
  return handlePreflight(req);
}

export async function POST(req: Request) {
  const limited = rateLimit(req, 'synastry');
  if (limited) return limited;

  const parsed = await readBoundedBody<{
    self?: Blueprint;
    other?: Blueprint;
    selfName?: string;
    otherName?: string;
    relation?: string;
  }>(req, 128 * 1024);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;
  if (!isWellFormedBlueprint(body.self) || !isWellFormedBlueprint(body.other)) {
    return withCors(NextResponse.json({ error: 'missing blueprints' }, { status: 400 }), req);
  }

  const self = body.self;
  const other = body.other;
  const aName = (body.selfName || 'you').toLowerCase();
  const bName = (body.otherName || 'they').toLowerCase();
  const relation = body.relation || '';

  // Identical blueprints (user accidentally saved themselves as a
  // partner, or two test charts collided). The math returns empty
  // aspects + identical life stages, and the model would invent
  // dynamics between two byte-identical charts. Short-circuit with
  // a friendly explanation pointing them at /chart.
  if (
    self.birth.iso === other.birth.iso &&
    Math.abs(self.birth.lat - other.birth.lat) < 0.001 &&
    Math.abs(self.birth.lon - other.birth.lon) < 0.001
  ) {
    return withCors(
      NextResponse.json(
        {
          error: 'identical charts',
          message: "That's the same chart on both sides. Use /chart to explore your own dynamics, or pick a different partner.",
        },
        { status: 400 },
      ),
      req,
    );
  }

  const aspects = computeSynastryAspects(self, other);
  const electric = computeElectricChannels(self, other).slice(0, 6);
  const stage = computeLifeStageDiff(self, other);

  const aspectLines = aspects.slice(0, 5).map((a) => `- ${aspectLabel(a, aName, bName)}`).join('\n');
  const electricLines = electric.map((c) => `- ${electricChannelLabel(c, aName, bName)}`).join('\n');
  const polarityA = stage.polarityA
    .map((p) => `${p.cycle.label}: ${p.positive ? 'rising' : 'descending'} ${Math.round(p.fraction * 100)}%`)
    .join(' · ');
  const polarityB = stage.polarityB
    .map((p) => `${p.cycle.label}: ${p.positive ? 'rising' : 'descending'} ${Math.round(p.fraction * 100)}%`)
    .join(' · ');

  const peopleBody = [
    `- ${aName.toUpperCase()} (use second person — "you"):`,
    `  · Sun ${self.natal.sun.sign}, Moon ${self.natal.moon.sign}, Mercury ${self.natal.mercury.sign}, Venus ${self.natal.venus.sign}, Mars ${self.natal.mars.sign}, Saturn ${self.natal.saturn.sign}`,
    `  · Type ${self.humanDesign.type} · Profile ${self.humanDesign.profile}`,
    `  · Currently age ${stage.ageA.toFixed(1)}`,
    stage.chapterA ? `  · In '${stage.chapterA.label}' (ages ${stage.chapterA.startAge}-${stage.chapterA.endAge}). ${stage.chapterA.description}` : '',
    `  · Polarity stack: ${polarityA} (${stage.risingA} rising, ${7 - stage.risingA} descending)`,
    `- ${bName.toUpperCase()}:`,
    `  · Sun ${other.natal.sun.sign}, Moon ${other.natal.moon.sign}, Mercury ${other.natal.mercury.sign}, Venus ${other.natal.venus.sign}, Mars ${other.natal.mars.sign}, Saturn ${other.natal.saturn.sign}`,
    `  · Type ${other.humanDesign.type} · Profile ${other.humanDesign.profile}`,
    `  · Currently age ${stage.ageB.toFixed(1)} (${stage.ageGapYears} year${stage.ageGapYears === 1 ? '' : 's'} ${stage.ageA > stage.ageB ? 'younger than you' : 'older than you'})`,
    stage.chapterB ? `  · In '${stage.chapterB.label}' (ages ${stage.chapterB.startAge}-${stage.chapterB.endAge}). ${stage.chapterB.description}` : '',
    `  · Polarity stack: ${polarityB} (${stage.risingB} rising, ${7 - stage.risingB} descending)`,
    stage.sameChapter ? '- Both currently in the SAME chapter of life.' : '- In DIFFERENT chapters right now.',
    relation ? `\nThe reader has labeled this relationship "${relation}".` : '',
  ].filter(Boolean).join('\n');

  const contactsBody = [
    aspectLines || '(no tight contacts between the charts)',
    electric.length > 0 ? `\nElectric channels (channels that complete between them — each carries one gate, alone neither has it):\n${electricLines}` : '',
  ].filter(Boolean).join('');

  const prompt = composePrompt({
    task: 'Write a compatibility reading between two people, framed by where each is in their own life right now. Output one paragraph of 110 to 150 words. Output only the paragraph — no preamble, no header, no quotation marks.',
    sections: [
      { header: 'THE PEOPLE', body: peopleBody },
      { header: 'CHART CONTACTS', body: contactsBody },
    ],
    rules: [
      'Open with the CONNECTION between the two charts — pull out the 1-2 specific tightest aspects above and name what they actually DO in the relationship in concrete behavioural terms. Not "harmonious", not "intense"; name a specific kind of moment that recurs between them. "She finishes his sentences before he\'s sure of them" is good; "deep mental connection" is not.',
      'Layer in the LIFE-STAGE context — name what each person is currently moving through (chapter, polarity stack texture) and how the connection lands DIFFERENTLY because of where each is RIGHT NOW. The same aspect at 27 vs 47 reads differently; that asymmetry matters.',
      'If there are electric channels, mention what they specifically give each other that neither has alone (no jargon — describe what the channel actually unlocks in the room together).',
      'Include exactly one observation that invites the reader to question a story they\'ve been telling themselves about this relationship — a frame they\'ve been holding, a meaning they\'ve attached to a recurring tension, a thing they\'ve been crediting or blaming the other person for that this chart-pair suggests might be a little misread.',
      'End with a quiet observation, not a prediction, not a verdict.',
    ],
    bans: [
      'Predict whether the relationship works.',
      'Tell the reader what to do.',
      'Name "Human Design", "channels", "aspects", "synastry", "astrology" by name in the paragraph.',
      'Use "your soulmate", "twin flame", "karmic", "destined", "meant to be" — none of that.',
    ],
  });

  const lifeStage = {
    ageA: stage.ageA,
    ageB: stage.ageB,
    ageGapYears: stage.ageGapYears,
    chapterA: stage.chapterA?.label ?? null,
    chapterB: stage.chapterB?.label ?? null,
    sameChapter: stage.sameChapter,
    risingA: stage.risingA,
    risingB: stage.risingB,
  };

  // Synastry is keyed by both blueprints + the relation label; same
  // pair + same relation → same reading. Charts and life-stage texture
  // don't shift much over 90 days, so a long TTL works well — and
  // partner lookups are the most expensive endpoint, so caching pays
  // out fastest here.
  const ckey = cacheKey('synastry', { self, other, relation });
  const cached = await getCached<SynastryReading>(ckey);
  if (cached) {
    return withCors(NextResponse.json(cached), req);
  }

  if (new URL(req.url).searchParams.get('stream') === '1') {
    return streamLLMResponse(req, {
      prompt,
      maxTokens: 500,
      temperature: 0.85,
      meta: {
        aspects,
        electricChannels: electric,
        lifeStage,
        generatedAt: new Date().toISOString(),
      },
      splitTakeaway: false,
      onComplete: ({ paragraph }) => {
        const reading: SynastryReading = {
          paragraph,
          aspects,
          electricChannels: electric,
          lifeStage,
          generatedAt: new Date().toISOString(),
        };
        void setCached(ckey, reading, TTL.synastry);
      },
    });
  }

  let paragraph: string;
  try {
    paragraph = await callLLM(prompt, { maxTokens: 500, temperature: 0.85 });
  } catch (e: unknown) {
    return llmErrorResponse(req, e, 'api/synastry');
  }

  const reading: SynastryReading = {
    paragraph,
    aspects,
    electricChannels: electric,
    lifeStage,
    generatedAt: new Date().toISOString(),
  };
  void setCached(ckey, reading, TTL.synastry);
  return withCors(NextResponse.json(reading), req);
}

