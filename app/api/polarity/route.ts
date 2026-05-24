import { NextResponse } from 'next/server';
import { ageInYears, positionInCycles } from '@/lib/cycles';
import { getClient, MODEL, textOf } from '@/lib/anthropic';
import type { Blueprint } from '@/lib/types';

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
  if (!bp) return NextResponse.json({ error: 'missing blueprint' }, { status: 400 });

  const age = ageInYears(bp.birth.iso);
  const positions = positionInCycles(age);

  const rising = positions.filter((p) => p.positive);
  const descending = positions.filter((p) => !p.positive);
  const tightest = positions
    .slice()
    .sort((a, b) => {
      // smallest absolute distance from a half-mark (flip point) first → most recent flip
      const da = Math.min(a.fraction, 1 - a.fraction);
      const db = Math.min(b.fraction, 1 - b.fraction);
      return da - db;
    });
  const mostRecentFlip = tightest[0];

  const lines = positions
    .map(
      (p) =>
        `- ${p.cycle.label} (${p.cycle.yearLength.toFixed(2)}y period): ${
          p.positive ? 'rising' : 'descending'
        } · ${(p.fraction * 100).toFixed(0)}% through period`,
    )
    .join('\n');

  const prompt = `Interpret the following polarity stack for a single person, in the dry, slightly clinical, slightly mystical voice of Co-Star.

${lines}

${rising.length} cycles are rising · ${descending.length} are descending.
The cycle that flipped most recently: ${mostRecentFlip?.cycle.label ?? 'none'} (${
    mostRecentFlip
      ? (mostRecentFlip.positive ? 'just opened' : 'just closed')
      : ''
  }).

Write one paragraph, 80-120 words, addressing the person directly. Name what the overall stack tends to feel like, lean on the most recent flip, and end on a sentence that lands like a quiet observation.

Hard bans: no "the universe", no "embrace", no "manifest", no "abundance", no "lean into", no emojis, no exclamation points, no rhetorical questions, no bullet points. No phrase that could appear in an airport-bookstore self-help book. Output only the paragraph.`;

  try {
    const client = getClient();
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      temperature: 0.75,
      messages: [{ role: 'user', content: prompt }],
    });
    return NextResponse.json({
      paragraph: textOf(msg),
      rising: rising.length,
      descending: descending.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
