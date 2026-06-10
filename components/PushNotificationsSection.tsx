'use client';

import { useEffect, useState } from 'react';
import { getPushState, subscribePush, unsubscribePush, type PushState } from '@/lib/push';
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
  const [state, setState] = useState<PushState>({ kind: 'default' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    const s = await getPushState();
    setState(s);
  }

  async function onEnable() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    const r = await subscribePush();
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
    await unsubscribePush();
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

  if (state.kind === 'unsupported') {
    return (
      <div className="border-l-2 border-hairline pl-3 py-1 text-[13px] text-ink-faint serif italic">
        Daily reminders aren't supported on this browser. On iOS, install the
        app first (Add to Home Screen), then try again.
      </div>
    );
  }

  if (state.kind === 'denied') {
    return (
      <div className="border-l-2 border-hairline pl-3 py-1 text-[13px] text-ink-dim serif">
        Notification permission was declined. Re-enable in your browser /
        system settings to turn reminders on.
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
        {state.kind === 'subscribed' ? (
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
    </div>
  );
}
