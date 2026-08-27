/**
 * Token-bucket rate limiter for the LLM endpoints.
 *
 * Without this, anyone with the URL can spam /api/ask or /api/synastry
 * and run up your Anthropic bill. The limiter is intentionally simple:
 * per-IP, in-memory, replenishes lazily on each request.
 *
 * On Vercel Hobby (single instance, cold starts wipe state) this gives
 * "best-effort" protection — a malicious user could distribute calls
 * across cold starts to dodge limits. For real abuse prevention you'd
 * swap in Vercel KV (one extra round-trip per call) but that eats
 * commands from your 30k/month KV quota. For an indie launch the
 * in-memory variant is a sane default.
 *
 * Tunable per-endpoint:
 *   · capacity   — burst allowance (max requests before throttle)
 *   · refillPerMinute — sustained rate (tokens regenerated per minute)
 *
 * Recommended settings per endpoint (cost per call → tolerance):
 *   /api/daily      — capacity 6, refill 12/min (high; daily-use)
 *   /api/polarity   — capacity 6, refill 12/min
 *   /api/narrative  — capacity 4, refill 4/min  (cached; rare)
 *   /api/year       — capacity 4, refill 4/min  (Pro only; rare)
 *   /api/ask        — capacity 8, refill 16/min (Pro; bursty use)
 *   /api/synastry   — capacity 4, refill 6/min  (Pro; per-partner)
 *
 * For all six, a determined attacker would need to wait ~60s after a
 * burst to keep going — which kills bot-scale abuse without affecting
 * humans.
 */

interface Bucket {
  /** Tokens currently available. */
  tokens: number;
  /** Last refill time (epoch ms). */
  updatedAt: number;
}

/** Module-level state. Survives between requests in the same warm
 *  function instance; resets on cold start. */
const buckets = new Map<string, Bucket>();

/** Periodic sweep so old IPs don't pile up forever in the Map. */
const SWEEP_INTERVAL_MS = 5 * 60_000;
const SWEEP_TTL_MS = 60 * 60_000;
let lastSweep = Date.now();

function sweepIfNeeded(now: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (now - bucket.updatedAt > SWEEP_TTL_MS) buckets.delete(key);
  }
}

export interface RateLimitConfig {
  capacity: number;
  refillPerMinute: number;
}

export interface RateLimitResult {
  ok: boolean;
  /** Tokens remaining after this attempt. */
  remaining: number;
  /** Seconds until the next token regenerates. 0 when ok. */
  retryAfterSeconds: number;
}

/**
 * Try to consume one token. Returns ok=true when allowed, ok=false
 * when throttled with a retry-after hint.
 *
 * `key` is typically the request IP. Endpoint name is included in the
 * key so per-endpoint quotas don't collide.
 */
export function tryConsume(
  key: string,
  endpoint: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now();
  sweepIfNeeded(now);

  const fullKey = `${endpoint}:${key}`;
  let bucket = buckets.get(fullKey);
  if (!bucket) {
    bucket = { tokens: config.capacity, updatedAt: now };
    buckets.set(fullKey, bucket);
  }

  // Refill since last touch.
  const elapsedMs = now - bucket.updatedAt;
  const refillTokens = (elapsedMs / 60_000) * config.refillPerMinute;
  bucket.tokens = Math.min(config.capacity, bucket.tokens + refillTokens);
  bucket.updatedAt = now;

  if (bucket.tokens < 1) {
    const tokensNeeded = 1 - bucket.tokens;
    const retryAfterSeconds = Math.ceil((tokensNeeded / config.refillPerMinute) * 60);
    return { ok: false, remaining: 0, retryAfterSeconds };
  }

  bucket.tokens -= 1;
  return {
    ok: true,
    remaining: Math.floor(bucket.tokens),
    retryAfterSeconds: 0,
  };
}

/**
 * Extract a stable identifier for the requester. Prefers the leftmost
 * X-Forwarded-For entry (Vercel sets this), falls back to a generic
 * "anonymous" key so the limiter still works in dev.
 */
export function requesterKey(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'anonymous';
}
