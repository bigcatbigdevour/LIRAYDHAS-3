/**
 * Shared LLM scaffolding for the daily / polarity / narrative / year /
 * synastry / ask endpoints.
 *
 * Before this file existed each route copy-pasted the same six things:
 *   · `const client = getClient()`
 *   · the `messages.create({ model, max_tokens, temperature, messages })`
 *     call shape
 *   · a try/catch that classified Anthropic exceptions into one of three
 *     user-safe messages
 *   · the `${VOICE_SPEC}\n\nTASK\n...` prompt joiner
 *   · NextResponse + withCors wiring on the 500 path
 *   · `console.error('[api/whatever] model call failed:', e)`
 *
 * Now they all call composePrompt() + callLLM() + (on catch)
 * llmErrorResponse(). The user-facing behaviour is byte-for-byte
 * identical — this is pure code health — but tuning the voice or
 * swapping the model is now a one-line change in one file instead of
 * six.
 */

import { NextResponse } from 'next/server';
import { getClient, MODEL, textOf } from './anthropic';
import { VOICE_SPEC } from './voice';
import { withCors } from './cors';

export interface PromptSection {
  /** All-caps header, e.g. "THE PERSON'S CHART", "TODAY", "WHAT TO INCLUDE". */
  header: string;
  /** Section body. Leading/trailing whitespace is trimmed; internal
   *  newlines preserved. */
  body: string;
}

export interface PromptParts {
  /** One short paragraph describing what we want the model to produce. */
  task: string;
  /** Ordered list of named sections (chart context, today's signals,
   *  the user's question, etc.). */
  sections?: PromptSection[];
  /**
   * Numbered "what to include" rules that constrain the output. Each
   * rendered as "1. ..." in a final WHAT TO INCLUDE block. Pass an
   * empty array (or omit) for prompts that don't want this trailing
   * section.
   */
  rules?: string[];
  /**
   * Optional final "DO NOT" block — useful for endpoints with extra
   * topical bans on top of VOICE_SPEC's standard bans. Rendered as
   * "- ..." bullets under a DO NOT header.
   */
  bans?: string[];
}

/** Compose the single user-role prompt sent to Anthropic. */
export function composePrompt(parts: PromptParts): string {
  const out: string[] = [VOICE_SPEC, '', 'TASK', parts.task.trim()];
  for (const s of parts.sections ?? []) {
    const body = s.body.trim();
    if (!body) continue;
    out.push('', s.header.trim(), body);
  }
  if (parts.rules && parts.rules.length > 0) {
    out.push('', 'WHAT TO INCLUDE');
    parts.rules.forEach((r, i) => out.push(`${i + 1}. ${r.trim()}`));
  }
  if (parts.bans && parts.bans.length > 0) {
    out.push('', 'DO NOT');
    parts.bans.forEach((b) => out.push(`- ${b.trim()}`));
  }
  return out.join('\n');
}

export interface CallOptions {
  /** Default 400. Range typically 200..600. */
  maxTokens?: number;
  /** Default 0.8. Lower = more deterministic, higher = more variation. */
  temperature?: number;
}

/**
 * Split a model response that was prompted to begin with a single
 * "takeaway" line followed by a blank line followed by the full
 * paragraph. The takeaway is trimmed and stripped of common prefix
 * artefacts ("TAKEAWAY:", surrounding quotes, leading bullet). The
 * paragraph is everything after the blank-line separator.
 *
 * If the model didn't follow the format (no blank line found), we
 * return the whole response as the paragraph and empty string as the
 * takeaway — callers should treat empty takeaway as "skip the badge".
 */
export function splitTakeaway(raw: string): { takeaway: string; paragraph: string } {
  const trimmed = raw.trim();
  // Look for the first double-newline split.
  const splitIdx = trimmed.search(/\n\s*\n/);
  if (splitIdx < 0) {
    return { takeaway: '', paragraph: trimmed };
  }
  let takeaway = trimmed.slice(0, splitIdx).trim();
  const paragraph = trimmed.slice(splitIdx).trim();

  // Clean common prefix artefacts.
  takeaway = takeaway
    .replace(/^(takeaway|tldr|one[\s-]?line)\s*[:\-—]\s*/i, '')
    .replace(/^["'“”‘’]+/, '')
    .replace(/["'“”‘’]+$/, '')
    .replace(/^[•·\-*]\s*/, '')
    .trim();

  // Reject pathological takeaways: too long (>200 chars) or too short
  // (< 4 words). The whole point is a glance-line.
  const wordCount = takeaway.split(/\s+/).filter(Boolean).length;
  if (takeaway.length > 200 || wordCount < 4) {
    return { takeaway: '', paragraph: trimmed };
  }
  return { takeaway, paragraph };
}

/**
 * Single-shot LLM call. Returns the text content of the response, or
 * throws on Anthropic failure. The caller is responsible for catching
 * and returning a friendly response — use llmErrorResponse() for that.
 */
export async function callLLM(prompt: string, opts: CallOptions = {}): Promise<string> {
  const client = getClient();
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 400,
    temperature: opts.temperature ?? 0.8,
    messages: [{ role: 'user', content: prompt }],
  });
  return textOf(msg);
}

/**
 * Build a 500 response with a calm, classified user message from an
 * Anthropic error. The raw exception is server-logged (with the source
 * tag) so debugging stays possible — but the client gets one of three
 * generic strings, never a stack frame or request id.
 */
export function llmErrorResponse(req: Request, e: unknown, source: string): NextResponse {
  console.error(`[${source}] model call failed:`, e);
  const msg = e instanceof Error ? e.message : '';
  const isOverload = /overloaded|rate|429/i.test(msg);
  const isAuth = /api[_ ]key|unauthorized|401/i.test(msg);
  const body = isAuth
    ? 'reading service not configured'
    : isOverload
      ? 'reading service is busy'
      : 'reading service failed';
  return withCors(NextResponse.json({ error: body }, { status: 500 }), req);
}
