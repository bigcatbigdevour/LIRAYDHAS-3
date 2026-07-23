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
import { withCors, corsHeaders } from './cors';
import { tryConsume, requesterKey, type RateLimitConfig } from './rateLimit';

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
  /**
   * Recent paragraphs this same reader has already seen on this
   * endpoint. Rendered as a "RECENT PARAGRAPHS — DO NOT REPEAT"
   * section so the model can avoid recycling phrasings, opening
   * lines, metaphors, or template observations. Empty/undefined =
   * unconstrained.
   */
  recentParagraphs?: string[];
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
  // Anti-repetition: most-recent first, cap to 5 paragraphs so the
  // context doesn't bloat or push out the task instructions. The cap
  // is also what makes the cache key stable enough to hit reliably.
  const recent = (parts.recentParagraphs ?? [])
    .filter((p): p is string => typeof p === 'string' && p.trim().length > 20)
    .slice(0, 5);
  if (recent.length > 0) {
    out.push(
      '',
      'RECENT PARAGRAPHS — DO NOT REPEAT THESE',
      "Below are the reader's last few readings on this surface. Don't reuse any of the same opening moves, phrasings, metaphors, observations, or self-knowledge nudges. Find a different angle on this chart, even when today's signals overlap with the last few days.",
    );
    recent.forEach((p, i) => {
      out.push('', `[${i + 1}]`, p.trim());
    });
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
 * Detect transient Anthropic errors worth retrying. Overload (529),
 * rate-limit (429), and 5xx are all transient. Auth (401), bad
 * request (400), and context-window (413) are NOT — retrying them
 * just wastes time + makes the user wait longer for the same error.
 */
function isTransientLLMError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : '';
  if (/overloaded|529/.test(msg)) return true;
  if (/rate.limit|429|too many requests/i.test(msg)) return true;
  if (/5\d\d|server error|timeout|ETIMEDOUT|ECONNRESET/i.test(msg)) return true;
  // Anthropic SDK exposes `.status` on its APIError class.
  const status = (e as { status?: number })?.status;
  if (typeof status === 'number' && (status === 429 || status === 529 || (status >= 500 && status < 600))) {
    return true;
  }
  return false;
}

/** Sleep with jitter so multiple concurrent retries don't sync up. */
function backoff(attempt: number): Promise<void> {
  // 400ms, 1.2s, 3s — with ±30% jitter.
  const base = 400 * Math.pow(3, attempt);
  const jitter = base * 0.3 * (Math.random() * 2 - 1);
  return new Promise((res) => setTimeout(res, base + jitter));
}

/**
 * Single-shot LLM call with retry on transient failures (overload,
 * rate limit, 5xx, network timeout). Returns the text content of the
 * response, or throws after the final retry exhausts. The caller is
 * responsible for catching and returning a friendly response — use
 * llmErrorResponse() for that.
 */
export async function callLLM(prompt: string, opts: CallOptions = {}): Promise<string> {
  const client = getClient();
  const MAX_ATTEMPTS = 3;
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: opts.maxTokens ?? 400,
        temperature: opts.temperature ?? 0.8,
        messages: [{ role: 'user', content: prompt }],
      });
      return textOf(msg);
    } catch (e) {
      lastError = e;
      if (attempt === MAX_ATTEMPTS - 1 || !isTransientLLMError(e)) {
        throw e;
      }
      await backoff(attempt);
    }
  }
  throw lastError;
}

export interface StreamResponseOptions extends CallOptions {
  prompt: string;
  /**
   * Fields to include in the initial `meta` event the client receives
   * before any text deltas. Use for things the server can compute
   * synchronously (chart positions, transit aspects, dates) so the
   * client can render structured UI in parallel with the paragraph.
   */
  meta?: Record<string, unknown>;
  /**
   * If true (default), watch the stream for the takeaway / paragraph
   * blank-line split and emit the takeaway as a separate `takeaway`
   * event. Off for endpoints that don't follow the takeaway format
   * (synastry, ask, year today don't, narrative + polarity + daily do).
   */
  splitTakeaway?: boolean;
  /**
   * Called once the stream finishes successfully with the canonical
   * takeaway + paragraph pair. Use for server-side cache writes so
   * the second user of the same inputs doesn't trigger another
   * Anthropic call. Runs fire-and-forget — failures should not
   * affect the user-facing response.
   */
  onComplete?: (result: { takeaway: string; paragraph: string }) => void;
}

/**
 * Build a server-sent-events response that streams Anthropic's text
 * deltas to the client as they're produced. Event sequence:
 *
 *   data: {"type":"meta", ...opts.meta}\n\n            (once, first)
 *   data: {"type":"takeaway","text":"…"}\n\n           (once, optional)
 *   data: {"type":"paragraph","text":"…"}\n\n          (many)
 *   data: {"type":"done","fullText":"…"}\n\n           (once, last)
 *   data: {"type":"error","message":"…"}\n\n           (on failure)
 *
 * The `done` event carries the assembled paragraph so the client can
 * persist it without having to concatenate deltas itself.
 *
 * On Anthropic error we send a single `error` event and close the
 * stream cleanly — the client treats this as a soft failure (no retry
 * banner), matching the non-streaming llmErrorResponse() semantics.
 */
export function streamLLMResponse(req: Request, opts: StreamResponseOptions): Response {
  const encoder = new TextEncoder();
  const wantsTakeaway = opts.splitTakeaway !== false;
  // When the client disconnects (user navigates away, AbortController
  // fires), Next.js calls the ReadableStream's cancel(). We pipe that
  // through an AbortController so the Anthropic stream can be told to
  // stop generating — otherwise we keep billing for tokens the user
  // will never see.
  const upstreamCtrl = new AbortController();
  let clientGone = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (data: unknown) => {
        if (clientGone) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Client disconnected — drop the rest silently.
          clientGone = true;
          upstreamCtrl.abort();
        }
      };

      if (opts.meta) {
        send({ type: 'meta', ...opts.meta });
      }

      let full = '';
      let splitFound = !wantsTakeaway;

      try {
        const client = getClient();
        const MAX_ATTEMPTS = 3;
        let streamErr: unknown;
        // Retry-on-transient is safe here only as long as we haven't
        // emitted any paragraph text yet — once the client sees deltas,
        // restarting would produce a duplicated paragraph. Most
        // transient errors (529 overloaded, 429 rate limit) surface
        // before the first token, so the retry catches them cleanly.
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
          try {
            const llmStream = client.messages.stream({
              model: MODEL,
              max_tokens: opts.maxTokens ?? 400,
              temperature: opts.temperature ?? 0.8,
              messages: [{ role: 'user', content: opts.prompt }],
            }, { signal: upstreamCtrl.signal });
            streamErr = null;
            for await (const event of llmStream) {
              if (event.type !== 'content_block_delta') continue;
              if (event.delta.type !== 'text_delta') continue;
              const delta = event.delta.text;
              full += delta;

              if (!splitFound) {
                // Buffer until we see the blank line, then split + flush.
                const idx = full.search(/\n\s*\n/);
                if (idx >= 0) {
                  const takeawayRaw = full.slice(0, idx);
                  const afterSplit = full.slice(idx).replace(/^\n\s*\n/, '');
                  const takeaway = cleanTakeaway(takeawayRaw);
                  if (takeaway) send({ type: 'takeaway', text: takeaway });
                  if (afterSplit) send({ type: 'paragraph', text: afterSplit });
                  splitFound = true;
                }
              } else {
                send({ type: 'paragraph', text: delta });
              }
            }
            break; // success
          } catch (err) {
            streamErr = err;
            const alreadyStreamed = full.length > 0;
            const isLast = attempt === MAX_ATTEMPTS - 1;
            if (alreadyStreamed || isLast || !isTransientLLMError(err)) throw err;
            // Reset accumulator and retry from the top.
            full = '';
            splitFound = !wantsTakeaway;
            await backoff(attempt);
          }
        }
        if (streamErr) throw streamErr;

        // If the model never produced a blank-line split, the entire
        // output is the paragraph (and no takeaway is emitted) — matches
        // splitTakeaway()'s fallback behaviour.
        if (!splitFound && full) {
          send({ type: 'paragraph', text: full });
        }

        // Recompute the canonical {takeaway, paragraph} pair the same
        // way splitTakeaway() does so the client can persist them
        // exactly the same as the non-streaming path would have.
        const { takeaway, paragraph } = wantsTakeaway
          ? splitTakeaway(full)
          : { takeaway: '', paragraph: full.trim() };
        send({ type: 'done', takeaway, paragraph });
        // Fire-and-forget cache write. Wrapped in try so a failing
        // callback never bubbles up to the user-facing response.
        if (opts.onComplete && paragraph) {
          try { opts.onComplete({ takeaway, paragraph }); } catch (e) {
            console.warn('[streamLLMResponse] onComplete threw:', e);
          }
        }
      } catch (e: unknown) {
        console.error('[streamLLMResponse] model call failed:', e);
        const msg = e instanceof Error ? e.message : '';
        const isOverload = /overloaded|rate|429/i.test(msg);
        const isAuth = /api[_ ]key|unauthorized|401/i.test(msg);
        const body = isAuth
          ? 'reading service not configured'
          : isOverload
            ? 'reading service is busy'
            : 'reading service failed';
        send({ type: 'error', message: body });
      } finally {
        controller.close();
      }
    },
    // Fires when the client disconnects (browser tab closed, user
    // navigates away, request AbortController.abort()). Propagate to
    // the upstream so we stop billing for tokens the user will never
    // see.
    cancel() {
      clientGone = true;
      upstreamCtrl.abort();
    },
  });

  // Some runtimes signal cancellation via the request's AbortSignal
  // rather than the ReadableStream.cancel callback. Wire both so we
  // catch either path.
  if (req.signal) {
    if (req.signal.aborted) {
      clientGone = true;
      upstreamCtrl.abort();
    } else {
      req.signal.addEventListener('abort', () => {
        clientGone = true;
        upstreamCtrl.abort();
      }, { once: true });
    }
  }

  const res = new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      // Disable Vercel/edge proxy buffering so events flush as they're
      // produced instead of arriving in one big chunk at the end.
      'X-Accel-Buffering': 'no',
      ...corsHeaders(req.headers.get('origin')),
    },
  });
  return res;
}

/**
 * Strip prefix artefacts from a takeaway line — same cleanup
 * splitTakeaway() does, factored out so streamLLMResponse can clean
 * the takeaway live as it's emitted (before the full paragraph is
 * known).
 */
function cleanTakeaway(raw: string): string {
  const t = raw
    .trim()
    .replace(/^(takeaway|tldr|one[\s-]?line)\s*[:\-—]\s*/i, '')
    .replace(/^["'“”‘’]+/, '')
    .replace(/["'“”‘’]+$/, '')
    .replace(/^[•·\-*]\s*/, '')
    .trim();
  const wordCount = t.split(/\s+/).filter(Boolean).length;
  if (t.length > 200 || wordCount < 4) return '';
  return t;
}


/**
 * Build a 500 response with a calm, classified user message from an
 * Anthropic error. The raw exception is server-logged (with the source
 * tag) so debugging stays possible — but the client gets one of three
 * generic strings, never a stack frame or request id.
 */
/**
 * Per-endpoint rate-limit config table. Tweak in one place if a route
 * gets noisy. See lib/rateLimit.ts for the burst-vs-refill explanation.
 */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  daily:     { capacity: 6, refillPerMinute: 12 },
  polarity:  { capacity: 6, refillPerMinute: 12 },
  narrative: { capacity: 4, refillPerMinute: 4 },
  year:      { capacity: 4, refillPerMinute: 4 },
  ask:       { capacity: 8, refillPerMinute: 16 },
  synastry:  { capacity: 4, refillPerMinute: 6 },
  // IAP validation fans out to Apple's API (up to 4 upstream calls per
  // request in the worst case). Legit clients hit it a handful of
  // times per session — purchase, restore, boot revalidation.
  iap:       { capacity: 6, refillPerMinute: 10 },
};

/**
 * Check the per-IP rate limit for an endpoint. Returns null when the
 * request is allowed; returns a 429 NextResponse when throttled (the
 * caller should return it directly).
 */
export function rateLimit(req: Request, endpoint: keyof typeof RATE_LIMITS): NextResponse | null {
  const config = RATE_LIMITS[endpoint];
  if (!config) return null;
  const key = requesterKey(req);
  const result = tryConsume(key, endpoint, config);
  if (result.ok) return null;
  const res = NextResponse.json(
    { error: 'reading service is busy', retryAfter: result.retryAfterSeconds },
    { status: 429 },
  );
  res.headers.set('Retry-After', String(result.retryAfterSeconds));
  return withCors(res, req);
}

/**
 * Default body-size cap for the LLM endpoints. A real blueprint is
 * ~10-30 KB; 64 KB is a generous ceiling that still defeats
 * "make the server choke on a 10 MB blob" attacks.
 *
 * Tunable per endpoint if any route legitimately needs more — synastry
 * takes two blueprints so it gets 128 KB.
 */
export const DEFAULT_MAX_BODY_BYTES = 64 * 1024;

/**
 * Read the request body as text, enforce a size cap, then JSON.parse.
 *
 * Why this and not just `req.json()`: the built-in parser will happily
 * accept a 10 MB body and spend memory + CPU parsing it before our
 * route handler runs. We want to reject oversized payloads at the
 * door so an attacker can't run up serverless CPU minutes for free.
 *
 * Returns either { ok: true, body } or { ok: false, response } where
 * response is a 400/413 NextResponse the caller should return directly.
 */
export async function readBoundedBody<T>(
  req: Request,
  maxBytes: number = DEFAULT_MAX_BODY_BYTES,
): Promise<{ ok: true; body: T } | { ok: false; response: NextResponse }> {
  // Honour Content-Length when present; it's not authoritative (some
  // clients omit or lie) but it lets us reject obvious offenders cheaply.
  const declared = req.headers.get('content-length');
  if (declared && Number(declared) > maxBytes) {
    return {
      ok: false,
      response: withCors(
        NextResponse.json({ error: 'request body too large' }, { status: 413 }),
        req,
      ),
    };
  }

  let text: string;
  try {
    text = await req.text();
  } catch {
    return {
      ok: false,
      response: withCors(
        NextResponse.json({ error: 'could not read request body' }, { status: 400 }),
        req,
      ),
    };
  }

  // Re-check on the actual bytes — a buggy or hostile client could
  // omit Content-Length and stream a huge body.
  if (text.length > maxBytes) {
    return {
      ok: false,
      response: withCors(
        NextResponse.json({ error: 'request body too large' }, { status: 413 }),
        req,
      ),
    };
  }

  try {
    return { ok: true, body: JSON.parse(text) as T };
  } catch {
    return {
      ok: false,
      response: withCors(
        NextResponse.json({ error: 'invalid json' }, { status: 400 }),
        req,
      ),
    };
  }
}

/**
 * Lightweight blueprint shape check. Confirms the minimum fields every
 * LLM route depends on are present — natal positions and the human
 * design summary. Includes every planet the enriched prompts now
 * reference so a stale pre-migration blueprint can't crash the
 * endpoint at deref-time.
 */
export function isWellFormedBlueprint(bp: unknown): bp is {
  natal: {
    sun: { sign: string; gate: number; line: number };
    moon: { sign: string; gate: number; line: number };
    mercury: { sign: string };
    venus: { sign: string };
    mars: { sign: string };
    jupiter: { sign: string };
    saturn: { sign: string };
  };
  humanDesign: { type: string; profile: string; activeChannels: [number, number][] };
  birth: { iso: string };
} {
  if (typeof bp !== 'object' || bp === null) return false;
  const b = bp as Record<string, unknown>;
  if (typeof b.natal !== 'object' || b.natal === null) return false;
  if (typeof b.humanDesign !== 'object' || b.humanDesign === null) return false;
  if (typeof b.birth !== 'object' || b.birth === null) return false;
  const natal = b.natal as Record<string, unknown>;
  const hd = b.humanDesign as Record<string, unknown>;
  const birth = b.birth as Record<string, unknown>;
  // Every planet referenced in prompt construction must be present
  // and shaped like a PlanetPos (object with a sign field).
  for (const key of ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'] as const) {
    const v = natal[key];
    if (typeof v !== 'object' || v === null) return false;
    if (typeof (v as { sign?: unknown }).sign !== 'string') return false;
  }
  if (typeof hd.type !== 'string') return false;
  if (typeof hd.profile !== 'string') return false;
  if (typeof birth.iso !== 'string') return false;
  return true;
}

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
