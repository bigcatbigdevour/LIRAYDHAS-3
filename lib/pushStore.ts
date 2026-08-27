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

/** Web push: VAPID-style PushSubscription. */
export interface StoredWebSubscription {
  kind: 'web';
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: number;
  prefs?: SubscriptionPrefs;
}

/** Native iOS: APNs device token from Capacitor. */
export interface StoredApnsSubscription {
  kind: 'apns';
  /** Hex device token from APNs. Used as the storage primary key. */
  token: string;
  createdAt: number;
  prefs?: SubscriptionPrefs;
}

export type StoredSubscription = StoredWebSubscription | StoredApnsSubscription;

interface Backend {
  add(sub: StoredSubscription): Promise<void>;
  /** `key` is the endpoint for web subs or the token for APNs. */
  remove(key: string): Promise<void>;
  list(): Promise<StoredSubscription[]>;
  /** True when this backend persists across requests. UI can warn otherwise. */
  isPersistent: boolean;
}

const KEY_PREFIX = 'liraydhas:push:sub:';

/** Subscription primary key — endpoint for web, token for APNs. */
function primaryKey(sub: StoredSubscription): string {
  return sub.kind === 'apns' ? sub.token : sub.endpoint;
}

// Vercel KV: one entry per subscription, key = prefix + hash(primaryKey).
// Listing uses SCAN under the hood via kv.keys('pattern*'), which is
// O(n) but fine for daily-reading audiences (tens of thousands tops).
const vercelKvBackend: Backend = {
  isPersistent: true,
  async add(sub) {
    const slug = await endpointSlug(primaryKey(sub));
    await kv.set(`${KEY_PREFIX}${slug}`, sub);
  },
  async remove(key) {
    const slug = await endpointSlug(key);
    await kv.del(`${KEY_PREFIX}${slug}`);
  },
  async list() {
    const keys = await kv.keys(`${KEY_PREFIX}*`);
    if (keys.length === 0) return [];
    const values = await kv.mget<StoredSubscription[]>(...keys);
    return values.filter((v): v is StoredSubscription => v !== null);
  },
};

// In-memory: a Map keyed by primary key. No persistence.
const memorySubs = new Map<string, StoredSubscription>();
const memoryBackend: Backend = {
  isPersistent: false,
  async add(sub) {
    memorySubs.set(primaryKey(sub), sub);
  },
  async remove(key) {
    memorySubs.delete(key);
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

export function removeSub(key: string): Promise<void> {
  return backend.remove(key);
}

export function listSubs(): Promise<StoredSubscription[]> {
  return backend.list();
}

export function isPushStorePersistent(): boolean {
  return backend.isPersistent;
}

/** web-push shape accepted by webpush.sendNotification(). Only valid for
 *  web-kind subscriptions; callers should guard with sub.kind === 'web'. */
export function toWebPush(sub: StoredWebSubscription): WebPushSub {
  return { endpoint: sub.endpoint, keys: sub.keys };
}
