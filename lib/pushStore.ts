/**
 * In-memory subscription registry — server-side ONLY.
 *
 * This is a deliberate stub. A real deploy needs a persistent store
 * (Postgres, DynamoDB, Redis, etc.) so subscriptions survive restarts
 * and you can iterate them for a daily-reading send job. The shape
 * below matches what a real DB row would carry; swap the Map for a
 * DB driver when you wire one up.
 *
 * The in-memory map works for:
 *   - local development (subscribe → test-send round-trip)
 *   - a single-instance production where you don't mind losing
 *     subscriptions across deploys (people would re-subscribe)
 *
 * It does NOT work for:
 *   - serverless deployments where each invocation is fresh
 *   - any scheduled cron that needs the full subscription list
 */

import type { PushSubscription as WebPushSub } from 'web-push';

interface StoredSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: number;
}

// Module-level state. Survives between requests inside the same Node
// process; resets on restart.
const subs = new Map<string, StoredSubscription>();

export function addSub(sub: StoredSubscription): void {
  subs.set(sub.endpoint, sub);
}

export function removeSub(endpoint: string): void {
  subs.delete(endpoint);
}

export function listSubs(): StoredSubscription[] {
  return Array.from(subs.values());
}

/** web-push shape accepted by webpush.sendNotification(). */
export function toWebPush(sub: StoredSubscription): WebPushSub {
  return { endpoint: sub.endpoint, keys: sub.keys };
}
