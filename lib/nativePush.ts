/**
 * Native push (Capacitor / APNs) — the App Store path.
 *
 * Web push (lib/push.ts) works in browsers + on iOS for installed PWAs,
 * but NOT for apps shipped via the App Store. App-Store apps run in a
 * native WKWebView shell and need Apple Push Notification service (APNs)
 * directly. Capacitor's @capacitor/push-notifications plugin handles
 * the iOS side; this module wraps it.
 *
 * Lifecycle:
 *   1. Detect native runtime (Capacitor.isNativePlatform()).
 *   2. Request notification permission.
 *   3. PushNotifications.register() → fires `registration` event with
 *      the APNs device token (hex string).
 *   4. POST {kind: 'apns', token, prefs} to /api/push/subscribe so the
 *      server can store it next to web push subs in the same KV store.
 *   5. Wire up `pushNotificationReceived` (foreground) and
 *      `pushNotificationActionPerformed` (background tap) listeners so
 *      the in-app UI can react to incoming pings.
 *
 * No-op on the web (so the same component can mount everywhere).
 */

import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { readClientPrefs, type ClientPrefs } from './push';

const TOKEN_KEY = 'liraydhas.apns.token.v1';

function currentTzOffsetMin(): number {
  return -new Date().getTimezoneOffset();
}

/** True if this code is running inside the Capacitor iOS / Android shell. */
export function isNativeRuntime(): boolean {
  return Capacitor.isNativePlatform();
}

export type NativePushState =
  | { kind: 'not-native' }
  | { kind: 'denied' }
  | { kind: 'default' }
  | { kind: 'registered'; token: string };

export async function getNativePushState(): Promise<NativePushState> {
  if (!isNativeRuntime()) return { kind: 'not-native' };
  try {
    const perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'denied') return { kind: 'denied' };
    if (perm.receive !== 'granted') return { kind: 'default' };
  } catch {
    return { kind: 'default' };
  }
  const token = window.localStorage.getItem(TOKEN_KEY);
  if (token) return { kind: 'registered', token };
  return { kind: 'default' };
}

/**
 * Request permission, register with APNs, and POST the resulting token
 * to the server. Returns the token (or an error reason).
 *
 * Idempotent: re-calling on an already-registered device just re-POSTs
 * the existing token + current prefs, useful when the user changes their
 * send-time and we want server-side prefs to update.
 */
export async function registerNativePush(): Promise<
  { ok: true; token: string } | { ok: false; reason: string }
> {
  if (!isNativeRuntime()) {
    return { ok: false, reason: 'native push only works inside the iOS / Android app' };
  }

  // Permission. iOS will show the system prompt the first time.
  let perm = await PushNotifications.checkPermissions();
  if (perm.receive !== 'granted') {
    perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') {
      return { ok: false, reason: 'notification permission was declined' };
    }
  }

  // Listen ONCE for the registration event, then call register() which
  // triggers APNs.
  const token = await new Promise<string | null>((resolve) => {
    let done = false;
    const finish = (t: string | null) => { if (!done) { done = true; resolve(t); } };
    const onReg = PushNotifications.addListener('registration', (t) => {
      onReg.then((s) => s.remove());
      onErr.then((s) => s.remove());
      finish(t.value);
    });
    const onErr = PushNotifications.addListener('registrationError', (e) => {
      onReg.then((s) => s.remove());
      onErr.then((s) => s.remove());
      console.error('[apns] registration error', e);
      finish(null);
    });
    // 15-second timeout in case APNs is slow / offline.
    window.setTimeout(() => finish(null), 15_000);
    PushNotifications.register().catch((e) => {
      console.error('[apns] register() threw', e);
      finish(null);
    });
  });
  if (!token) return { ok: false, reason: 'APNs did not return a device token' };

  window.localStorage.setItem(TOKEN_KEY, token);

  // POST to the same subscribe endpoint as web push, distinguished by
  // kind: 'apns'. Server stores them in the same KV namespace.
  const prefs = readClientPrefs();
  try {
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        kind: 'apns',
        token,
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
  } catch {
    return { ok: false, reason: 'could not reach the reminders service' };
  }

  return { ok: true, token };
}

export async function unregisterNativePush(): Promise<void> {
  if (!isNativeRuntime()) return;
  try {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (token) {
      try {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ kind: 'apns', token }),
        });
      } catch {/* ignore */}
    }
    await PushNotifications.removeAllListeners();
    window.localStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    console.warn('[apns] unregister failed', e);
  }
}

/** Wire up runtime listeners — foreground pings + background-tap navigations.
 *  Call once at app startup (e.g. from a useEffect in the layout). */
export async function installNativeListeners(): Promise<void> {
  if (!isNativeRuntime()) return;
  // Foreground notification: surface as a toast or update an in-app
  // counter. Today this is just logged — UI hookup is left to callers
  // who want to do something with it.
  await PushNotifications.addListener('pushNotificationReceived', (n) => {
    console.log('[apns] foreground ping:', n);
  });
  // Background tap: navigate to the url in the payload.
  await PushNotifications.addListener('pushNotificationActionPerformed', (a) => {
    const url = (a.notification.data && a.notification.data.url) || '/today';
    if (typeof window !== 'undefined') {
      window.location.assign(url);
    }
  });
}
