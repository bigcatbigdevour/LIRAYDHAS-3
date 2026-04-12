import { NextResponse } from 'next/server';
import { getClient, MODEL, textOf } from '@/lib/claude';
import type { QuestionRequestBody } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FIRST_QUESTION_SYSTEM = `You are opening a Socratic questioning that has no end.

Generate ONE deceptively simple, open-ended question that invites the user to assert something they believe is true — about themselves, another person, or the world. The question should feel gentle and obvious on the surface, the kind of thing someone could answer in a single short sentence, but it must leave room for an assumption to be embedded in the answer.

Output ONLY the question itself. No preamble. No quotes. No explanation. No numbering. One or two sentences maximum.`;

const FOLLOWUP_SYSTEM = `You are a Socratic questioner. The user just answered a question. Your job is to identify the core assumption or certainty in their answer and ask one follow-up question that gently but directly challenges or disproves that assumption. The user should feel their answer was heard — but that it opens into something they had not considered. Questions start simple and accessible, then grow in philosophical depth as the conversation continues. Draw occasionally from themes like quantum physics, cycles of the universe, astrology, numerology, the nature of identity, and the limits of human perception. Tone is easy, unhurried, and curious — the weight comes entirely from the questions themselves. Never state a conclusion. Never explain your intent. Never let an answer land safely.

Output ONLY the next question. No preamble. No quotes. No meta-commentary. No numbering. One or two sentences.`;

export async function POST(req: Request) {
  let body: QuestionRequestBody;
  try {
    body = (await req.json()) as QuestionRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const history = Array.isArray(body?.history) ? body.history : [];

  try {
    const client = getClient();

    // First question of the session — no history.
    if (history.length === 0) {
      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: 200,
        temperature: 0.95,
        system: FIRST_QUESTION_SYSTEM,
        messages: [
          {
            role: 'user',
            content: 'Ask the opening question.',
          },
        ],
      });
      return NextResponse.json({ question: cleanQuestion(textOf(msg)) });
    }

    // Subsequent question — feed the conversation so far.
    const conversation: Array<{
      role: 'user' | 'assistant';
      content: string;
    }> = [];
    for (const turn of history) {
      conversation.push({ role: 'assistant', content: turn.question });
      conversation.push({ role: 'user', content: turn.answer });
    }
    // Final nudge: ask the model to produce the next question now.
    conversation.push({
      role: 'user',
      content:
        '(Now ask the next question — the one that quietly unsettles the assumption in my last answer.)',
    });

    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 220,
      temperature: 0.9,
      system: FOLLOWUP_SYSTEM,
      messages: conversation,
    });

    return NextResponse.json({ question: cleanQuestion(textOf(msg)) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error.';
    return NextResponse.json(
      { error: `The questioning could not continue. ${message}` },
      { status: 500 }
    );
  }
}

// Strip stray quotes / numbering / labels that sometimes sneak in.
function cleanQuestion(raw: string): string {
  let q = raw.trim();
  // Remove wrapping quotes.
  q = q.replace(/^["“'‘]+|["”'’]+$/g, '');
  // Remove leading "Question:" or "1." style prefixes.
  q = q.replace(/^(question\s*[:\-–]\s*|\d+\s*[.)]\s*)/i, '');
  return q.trim();
}
