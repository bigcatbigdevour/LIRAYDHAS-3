/**
 * Server-side LLM response cache.
 *
 * The LLM-generated paragraphs (daily, narrative, year, polarity,
 * synastry) are mostly deterministic given the same inputs. A user
 * opening /today three times in a day shouldn't trigger three
 * Anthropic calls — same blueprint + same date should return the
 * same paragraph, instantly, costing zero tokens.
 *
 * Backend selection mirrors pushStore.ts:
 *   - Vercel KV when KV_REST_API_URL + KV_REST_API_TOKEN are set
 *     (auto-injected when Vercel KV is enabled on the project).
 *   - In-memory Map fallback for dev / single-instance demos.
 *
 * Failure modes are silent: if KV throws on get(), we treat it as
 * a miss and let the request flow normally. If KV throws on set(),
 * we log and continue — the user got their reading, only the cache
 * write failed.
 *
 * Cache hits return a non-streaming JSON response (same shape as the
 * non-streaming endpoint path). The client's isEventStream() check
 * routes it down the JSON branch automatically — no client change
 * needed to consume cached responses.
 */

import { createHash } from 'crypto';
import { kv } from '@vercel/kv';

const hasKv = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

const memoryStore = new Map<string, { value: unknown; expiresAt: number }>();

/** Shape a deterministic cache key from an arbitrary JSON-serialisable input. */
export function cacheKey(namespace: string, input: unknown): string {
  const json = JSON.stringify(input);
  const hash = createHash('sha256').update(json).digest('base64url').slice(0, 24);
  return `llm:${namespace}:${hash}`;
}

export async function getCached<T = unknown>(key: string): Promise<T | null> {
  try {
    if (hasKv) {
      const v = await kv.get<T>(key);
      return v ?? null;
    }
    const entry = memoryStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      memoryStore.delete(key);
      return null;
    }
    return entry.value as T;
  } catch (e) {
    // KV unreachable or temporary failure — treat as cache miss.
    console.warn('[llmCache] get failed:', e);
    return null;
  }
}

/**
 * Write a value to the cache with a TTL in seconds. Silent on failure
 * — the user already got their answer; a failed cache write is not a
 * user-facing problem.
 */
export async function setCached(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  try {
    if (hasKv) {
      await kv.set(key, value, { ex: ttlSeconds });
      return;
    }
    memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    // Bound the in-memory map so dev/test doesn't leak.
    if (memoryStore.size > 500) {
      const oldest = [...memoryStore.entries()]
        .sort((a, b) => a[1].expiresAt - b[1].expiresAt)
        .slice(0, 100);
      for (const [k] of oldest) memoryStore.delete(k);
    }
  } catch (e) {
    console.warn('[llmCache] set failed:', e);
  }
}

/**
 * Standard TTLs (in seconds) for each endpoint. Tuned so cache stays
 * accurate to the underlying signal cadence:
 *   · daily reading: 24h — the inputs (date + transits) change by day
 *   · year reading: 30d — yearly stations / returns move slowly
 *   · narrative: 90d — chart never changes; soft refresh to pick up
 *     prompt-engineering edits without orphaning forever
 *   · polarity: 14d — cycle phases shift week to week
 *   · synastry: 90d — both charts static; refresh same as narrative
 *
 * /api/ask is intentionally not cached — every question is unique.
 */
export const TTL = {
  daily: 24 * 60 * 60,
  year: 30 * 24 * 60 * 60,
  narrative: 90 * 24 * 60 * 60,
  polarity: 14 * 24 * 60 * 60,
  synastry: 90 * 24 * 60 * 60,
} as const;
