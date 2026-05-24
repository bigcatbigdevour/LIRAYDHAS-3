import { NextResponse } from 'next/server';
import { getClient, MODEL, textOf } from '@/lib/anthropic';
import { profileName } from '@/lib/humandesign/interpretations';
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

  const hd = bp.humanDesign;
  const n = bp.natal;
  const channels = hd.activeChannels.map(([a, b]) => `${a}-${b}`).join(', ') || 'no defined channels';
  const centers = hd.definedCenters.length === 0
    ? 'no defined centers (Reflector)'
    : hd.definedCenters.map((c) => c === 'SolarPlexus' ? 'Solar Plexus' : c).join(', ');

  const prompt = `Write a 90-120 word standalone summary of this person's chart in the Co-Star voice — direct, dry, slightly clinical, slightly mystical. Anchor in the specific combination of:

- Sun in ${n.sun.sign} (gate ${n.sun.gate}.${n.sun.line})
- Moon in ${n.moon.sign}
${n.asc !== null ? `- Rising sign in their personality` : '- (birth time unknown — soft profile)'}
- Human Design type: ${hd.type}
- Strategy: ${hd.strategy}
- Authority: ${hd.authority}
- Profile: ${hd.profile} (${profileName(hd.profile)})
- Definition: ${hd.definition}
- Defined centers: ${centers}
- Active channels: ${channels}

Speak to them in second person. Name the texture this combination creates — not a list of attributes but the actual feel of being them. End with a sentence that lands like a quiet observation, not a command or pep talk. No emojis. No exclamation points. No "you are special". Output only the paragraph.`;

  try {
    const client = getClient();
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      temperature: 0.85,
      messages: [{ role: 'user', content: prompt }],
    });
    return NextResponse.json({
      paragraph: textOf(msg),
      generatedAt: new Date().toISOString(),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
