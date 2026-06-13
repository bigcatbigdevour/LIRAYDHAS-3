/**
 * Client-side reader for the SSE streams that lib/llm.ts emits from
 * the LLM endpoints. Wraps the ReadableStream + TextDecoder + line-
 * buffer machinery so each consumer just provides callbacks.
 *
 * Event shapes match streamLLMResponse() in lib/llm.ts:
 *   { type: 'meta', ...meta }
 *   { type: 'takeaway', text }
 *   { type: 'paragraph', text }
 *   { type: 'done', takeaway, paragraph }
 *   { type: 'error', message }
 */

export interface StreamHandlers {
  /** Initial event carrying server-side computed metadata (date, transits, etc.). */
  meta?: (data: Record<string, unknown>) => void;
  /** The one-line takeaway, when the endpoint emits one. */
  takeaway?: (text: string) => void;
  /**
   * A chunk of paragraph text arrived. `full` is the accumulated
   * paragraph so far (already concatenated across deltas — caller
   * doesn't need to track its own buffer).
   */
  paragraph?: (delta: string, full: string) => void;
  /** Final event: the canonical takeaway + paragraph pair. */
  done?: (data: { takeaway: string; paragraph: string }) => void;
  /** Soft-failure event from the server (Anthropic outage, etc.). */
  error?: (message: string) => void;
}

interface StreamEvent {
  type?: string;
  text?: string;
  message?: string;
  takeaway?: string;
  paragraph?: string;
  [k: string]: unknown;
}

/**
 * Consume an SSE response from one of the LLM endpoints. Resolves when
 * the stream closes or `signal` aborts. Errors thrown by `fetch` are
 * propagated; soft errors from the model are surfaced via
 * `handlers.error` and resolve normally.
 */
export async function readSseStream(
  res: Response,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let paragraphFull = '';

  try {
    while (true) {
      if (signal?.aborted) return;
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      // SSE event boundary is a blank line.
      let i: number;
      while ((i = buf.indexOf('\n\n')) !== -1) {
        const raw = buf.slice(0, i);
        buf = buf.slice(i + 2);
        // We only emit single `data: …` events, so the per-event payload
        // is one line — but tolerate a leading event header just in case.
        const m = raw.match(/^data: (.*)$/m);
        if (!m) continue;
        let evt: StreamEvent;
        try {
          evt = JSON.parse(m[1]) as StreamEvent;
        } catch {
          continue;
        }
        if (evt.type === 'meta') {
          handlers.meta?.(evt as Record<string, unknown>);
        } else if (evt.type === 'takeaway' && typeof evt.text === 'string') {
          handlers.takeaway?.(evt.text);
        } else if (evt.type === 'paragraph' && typeof evt.text === 'string') {
          paragraphFull += evt.text;
          handlers.paragraph?.(evt.text, paragraphFull);
        } else if (evt.type === 'done') {
          handlers.done?.({
            takeaway: typeof evt.takeaway === 'string' ? evt.takeaway : '',
            paragraph: typeof evt.paragraph === 'string' ? evt.paragraph : paragraphFull,
          });
        } else if (evt.type === 'error' && typeof evt.message === 'string') {
          handlers.error?.(evt.message);
        }
      }
    }
  } finally {
    try { reader.releaseLock(); } catch { /* already released */ }
  }
}

/**
 * True when the response is an SSE stream. False when the server fell
 * back to JSON (offline cache, or a non-streaming endpoint).
 */
export function isEventStream(res: Response): boolean {
  return (res.headers.get('content-type') ?? '').includes('event-stream');
}
