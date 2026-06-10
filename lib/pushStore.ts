/**
 * Push-subscription storage with a pluggable backend.
 *
 * Two backends:
 *   - VercelKV: production. Persists across cold starts, every serverless
 *     invocation, and deploys. Auto-detected when KV_REST_API_URL +
 *     KV_REST_API_TOKEN are set (Vercel injects these automatically the
 *     moment you enable Vercel KV in the project dashboard).
 *   - InMemory: development fallback. A module-level Map that lives only
 *     for the lifetime of a single Node process. Fine for `npm run dev`
 *     and one-instance demos.
 *
 * The chosen backend is decided ONCE at module load via env-var sniffing.
 * Swap by setting / unsetting KV_REST_API_URL.
 */

import { kv } from '@vercel/kv';
import type { PushSubscription as WebPushSub } from 'web-push';

export interface SubscriptionPrefs {
  /** Local hour the user wants the daily reminder, 0..23. */
  hourLocal: number;
  /** Minutes that hourLocal is offset from UTC. Positive = east of UTC. */
  tzOffsetMin: number;
  /** Which kinds of notifications to send. */
  types: {
    daily: boolean;
    anniversary: boolean;
    weekly: boolean;
  };
}

export const DEFAULT_PREFS: SubscriptionPrefs = {
  hourLocal: 8,
  tzOffsetMin: 0,
  types: { daily: true, anniversary: true, weekly: true },
};

export interface StoredSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: number;
  /** User-controlled send-time + per-type toggles. Defaults applied if
   *  missing (subscriptions saved before this field existed). */
  prefs?: SubscriptionPrefs;
}

interface Backend {
  add(sub: StoredSubscription): Promise<void>;
  remove(endpoint: string): Promise<void>;
  list(): Promise<StoredSubscription[]>;
  /** True when this backend persists across requests. UI can warn otherwise. */
  isPersistent: boolean;
}

const KEY_PREFIX = 'liraydhas:push:sub:';

// Vercel KV: one entry per subscription, key = prefix + endpoint hash.
// Listing uses SCAN under the hood via kv.keys('pattern*'), which is
// O(n) but fine for daily-reading audiences (tens of thousands tops).
const vercelKvBackend: Backend = {
  isPersistent: true,
  async add(sub) {
    // Hash endpoint to a short slug; endpoints can be 300+ chars and
    // Redis keys behave better short.
    const slug = await endpointSlug(sub.endpoint);
    await kv.set(`${KEY_PREFIX}${slug}`, sub);
  },
  async remove(endpoint) {
    const slug = await endpointSlug(endpoint);
    await kv.del(`${KEY_PREFIX}${slug}`);
  },
  async list() {
    const keys = await kv.keys(`${KEY_PREFIX}*`);
    if (keys.length === 0) return [];
    const values = await kv.mget<StoredSubscription[]>(...keys);
    return values.filter((v): v is StoredSubscription => v !== null);
  },
};

// In-memory: a Map keyed by endpoint. No persistence.
const memorySubs = new Map<string, StoredSubscription>();
const memoryBackend: Backend = {
  isPersistent: false,
  async add(sub) {
    memorySubs.set(sub.endpoint, sub);
  },
  async remove(endpoint) {
    memorySubs.delete(endpoint);
  },
  async list() {
    return Array.from(memorySubs.values());
  },
};

const backend: Backend =
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
    ? vercelKvBackend
    : memoryBackend;

/**
 * Stable short slug from a subscription endpoint. Uses SHA-256 hex; we
 * only need uniqueness, not crypto strength. Web Crypto is available in
 * the Node serverless runtime.
 */
async function endpointSlug(endpoint: string): Promise<string> {
  const data = new TextEncoder().encode(endpoint);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(hash);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out.slice(0, 24);
}

export function addSub(sub: StoredSubscription): Promise<void> {
  return backend.add(sub);
}

export function removeSub(endpoint: string): Promise<void> {
  return backend.remove(endpoint);
}

export function listSubs(): Promise<StoredSubscription[]> {
  return backend.list();
}

export function isPushStorePersistent(): boolean {
  return backend.isPersistent;
}

/** web-push shape accepted by webpush.sendNotification(). */
export function toWebPush(sub: StoredSubscription): WebPushSub {
  return { endpoint: sub.endpoint, keys: sub.keys };
}
