'use client';

import { useEffect, useState } from 'react';
import {
  getPushState,
  subscribePush,
  unsubscribePush,
  readClientPrefs,
  writeClientPrefs,
  type PushState,
  type ClientPrefs,
} from '@/lib/push';
import {
  isNativeRuntime,
  getNativePushState,
  registerNativePush,
  unregisterNativePush,
  type NativePushState,
} from '@/lib/nativePush';
import { tap as hapticTap } from '@/lib/haptics';

/**
 * Settings panel for daily reminders. Renders on /about.
 *
 * The actual sending requires VAPID keys + a scheduler on the server.
 * This panel handles the client side (request permission, subscribe to
 * the push service, store the subscription on the server) and surfaces
 * a "send test" button so the user can verify their device is reachable.
 */
export default function PushNotificationsSection() {
  // When we're inside the iOS app shell we use APNs (native push).
  // In a browser we use web push. The two are stored together server-side
  // so the cron + test endpoint don't need to care; only this UI
  // distinguishes the kind to pick the right register/unregister path.
  const native = isNativeRuntime();
  const [state, setState] = useState<PushState>({ kind: 'default' });
  const [nativeState, setNativeState] = useState<NativePushState>(
    native ? { kind: 'default' } : { kind: 'not-native' },
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<ClientPrefs>(() => readClientPrefs());

  const isSubscribed =
    state.kind === 'subscribed' || nativeState.kind === 'registered';

  function updatePrefs(patch: Partial<ClientPrefs>) {
    const next: ClientPrefs = {
      ...prefs,
      ...patch,
      types: { ...prefs.types, ...(patch.types ?? {}) },
    };
    setPrefs(next);
    writeClientPrefs(next);
    // If we're already subscribed, re-POST to update server-side prefs.
    if (isSubscribed) {
      if (native) void registerNativePush();
      else void subscribePush();
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    if (native) {
      setNativeState(await getNativePushState());
    } else {
      setState(await getPushState());
    }
  }

  async function onEnable() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    const r = native ? await registerNativePush() : await subscribePush();
    if (r.ok) {
      setMsg("subscribed · you'll get the daily reading.");
      await refresh();
    } else {
      setMsg(r.reason);
    }
    setBusy(false);
  }

  async function onDisable() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    if (native) {
      await unregisterNativePush();
    } else {
      await unsubscribePush();
    }
    setMsg('reminders off.');
    await refresh();
    setBusy(false);
  }

  async function onTest() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: 'Liraydhas',
          body: 'a test reminder',
          url: '/today',
        }),
      });
      if (r.status === 501) {
        setMsg('not configured on the server — see README for VAPID setup.');
      } else if (r.ok) {
        const j = (await r.json()) as { sent: number };
        setMsg(j.sent > 0 ? "sent — check your phone." : 'no devices subscribed yet.');
      } else {
        setMsg('test send failed.');
      }
    } catch {
      setMsg('could not reach the reminders service.');
    }
    setBusy(false);
  }

  if (!native && state.kind === 'unsupported') {
    return (
      <div className="border-l-2 border-hairline pl-3 py-1 text-[13px] text-ink-faint serif italic">
        Daily reminders aren't supported on this browser. On iOS, install the
        app first (Add to Home Screen), then try again.
      </div>
    );
  }

  if (
    (native && nativeState.kind === 'denied') ||
    (!native && state.kind === 'denied')
  ) {
    return (
      <div className="border-l-2 border-hairline pl-3 py-1 text-[13px] text-ink-dim serif">
        Notification permission was declined. Re-enable in your iOS / browser
        settings to turn reminders on.
      </div>
    );
  }

  return (
    <div className="border-l-2 border-accent pl-3 py-2 space-y-2">
      <p
        className="small-label caps text-accent"
        style={{ letterSpacing: '0.18em' }}
      >
        daily reminders
      </p>
      <p className="text-[13px] text-ink-dim serif leading-relaxed">
        A quiet ping when your reading is ready. Permission lives in your
        browser only; you can turn it off anytime.
      </p>
      <div className="flex flex-wrap gap-3 items-center">
        {isSubscribed ? (
          <>
            <button
              type="button"
              onClick={() => { hapticTap('light'); void onDisable(); }}
              disabled={busy}
              className="btn-ghost"
            >
              turn off
            </button>
            <button
              type="button"
              onClick={() => { hapticTap('light'); void onTest(); }}
              disabled={busy}
              className="small-label caps text-ink-faint hover:text-ink"
              style={{ letterSpacing: '0.16em' }}
            >
              send test
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => { hapticTap('medium'); void onEnable(); }}
            disabled={busy}
            className="btn-ghost"
          >
            enable reminders
          </button>
        )}
      </div>
      {msg && (
        <p className="small-label caps text-ink-faint text-[10px] mt-1" style={{ letterSpacing: '0.16em' }}>
          {msg}
        </p>
      )}

      {isSubscribed && (
        <div className="mt-3 pt-3 border-t border-hairline space-y-3">
          <div>
            <label
              className="small-label caps text-ink-faint text-[10px] block mb-1"
              style={{ letterSpacing: '0.16em' }}
            >
              ping me at
            </label>
            <select
              value={prefs.hourLocal}
              onChange={(e) => updatePrefs({ hourLocal: parseInt(e.currentTarget.value, 10) })}
              className="bg-bg border border-hairline px-2 py-1 text-[13px] text-ink"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {h.toString().padStart(2, '0')}:00 ({h === 0 ? '12 am' : h < 12 ? `${h} am` : h === 12 ? '12 pm' : `${h - 12} pm`})
                </option>
              ))}
            </select>
            <span
              className="small-label caps text-ink-faint text-[9px] ml-2"
              style={{ letterSpacing: '0.14em' }}
            >
              your local time
            </span>
          </div>
          <div className="space-y-1.5">
            <p
              className="small-label caps text-ink-faint text-[10px]"
              style={{ letterSpacing: '0.16em' }}
            >
              what to send
            </p>
            {([
              ['daily', 'daily reading'],
              ['anniversary', 'a year ago today'],
              ['weekly', 'monday week-behind'],
            ] as const).map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 text-[13px] text-ink-dim cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.types[k]}
                  onChange={(e) => updatePrefs({ types: { ...prefs.types, [k]: e.currentTarget.checked } })}
                  className="accent-accent"
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
