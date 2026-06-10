/**
 * Web Push helpers for the client.
 *
 * The flow:
 *  1. User taps "enable daily reminders" → request Notification permission.
 *  2. If granted, get the registered service worker and call
 *     pushManager.subscribe({ applicationServerKey: VAPID_PUBLIC }).
 *  3. POST the resulting PushSubscription to /api/push/subscribe so the
 *     server can store it and later send messages.
 *
 * The VAPID public key comes from the server via /api/push/vapid (so
 * rotation doesn't require a client redeploy).
 */

const SUBSCRIPTION_FLAG = 'liraydhas.push.subscribed.v1';

export type PushState =
  | { kind: 'unsupported' }
  | { kind: 'denied' }
  | { kind: 'default' }
  | { kind: 'subscribed' };

export async function getPushState(): Promise<PushState> {
  if (typeof window === 'undefined') return { kind: 'unsupported' };
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { kind: 'unsupported' };
  }
  if (Notification.permission === 'denied') return { kind: 'denied' };
  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) return { kind: 'subscribed' };
  } catch {/* ignore */}
  return { kind: 'default' };
}

function urlBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(b64);
  // Allocate a fresh ArrayBuffer so pushManager.subscribe gets a
  // BufferSource it accepts under strict TS lib types (Uint8Array's
  // .buffer is ArrayBufferLike, not ArrayBuffer).
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

export interface ClientPrefs {
  hourLocal: number;
  types: { daily: boolean; anniversary: boolean; weekly: boolean };
}

export const DEFAULT_CLIENT_PREFS: ClientPrefs = {
  hourLocal: 8,
  types: { daily: true, anniversary: true, weekly: true },
};

const PREFS_KEY = 'liraydhas.push.prefs.v1';

export function readClientPrefs(): ClientPrefs {
  if (typeof window === 'undefined') return DEFAULT_CLIENT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_CLIENT_PREFS;
    const parsed = JSON.parse(raw) as Partial<ClientPrefs>;
    return {
      hourLocal: Math.max(0, Math.min(23, Math.floor(parsed.hourLocal ?? 8))),
      types: {
        daily: parsed.types?.daily ?? true,
        anniversary: parsed.types?.anniversary ?? true,
        weekly: parsed.types?.weekly ?? true,
      },
    };
  } catch {
    return DEFAULT_CLIENT_PREFS;
  }
}

export function writeClientPrefs(p: ClientPrefs): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PREFS_KEY, JSON.stringify(p));
}

/** Local timezone offset in minutes, east-positive. JS getTimezoneOffset is
 *  west-positive (sign-inverted) so flip it. */
function currentTzOffsetMin(): number {
  return -new Date().getTimezoneOffset();
}

export async function subscribePush(): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (typeof window === 'undefined') return { ok: false, reason: 'no window' };
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return { ok: false, reason: 'push not supported on this browser' };
  }
  let perm = Notification.permission;
  if (perm === 'default') {
    perm = await Notification.requestPermission();
  }
  if (perm !== 'granted') {
    return { ok: false, reason: 'notification permission was declined' };
  }
  // Fetch the server's VAPID public key. Without it the subscription
  // can't be addressed by the server.
  let vapidPublic: string;
  try {
    const r = await fetch('/api/push/vapid');
    const j = (await r.json()) as { key?: string };
    if (!j.key) {
      return {
        ok: false,
        reason: 'reminders not configured — the server is missing VAPID keys',
      };
    }
    vapidPublic = j.key;
  } catch {
    return { ok: false, reason: 'could not reach the reminders service' };
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToArrayBuffer(vapidPublic),
    });
    const prefs = readClientPrefs();
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...sub.toJSON(),
        prefs: {
          hourLocal: prefs.hourLocal,
          tzOffsetMin: currentTzOffsetMin(),
          types: prefs.types,
        },
      }),
    });
    if (!res.ok) {
      return { ok: false, reason: `server rejected the subscription (${res.status})` };
    }
    window.localStorage.setItem(SUBSCRIPTION_FLAG, '1');
    return { ok: true };
  } catch (e) {
    console.error('push subscribe failed', e);
    return { ok: false, reason: e instanceof Error ? e.message : 'unknown error' };
  }
}

export async function unsubscribePush(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      // Best-effort tell the server to forget us too.
      try {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        });
      } catch {/* ignore */}
    }
    window.localStorage.removeItem(SUBSCRIPTION_FLAG);
  } catch (e) {
    console.warn('push unsubscribe failed', e);
  }
}
