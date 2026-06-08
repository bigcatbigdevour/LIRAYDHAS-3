'use client';

import { useEffect, useState } from 'react';

/**
 * Small fixed banner that surfaces when the device goes offline. The chart,
 * arcs, polarity, and HD math all keep working (everything is computed
 * client-side from the persisted blueprint), but the LLM-written paragraphs
 * on /today and /chart need the API — so we tell the user what they can
 * and can't expect.
 *
 * Only renders after the first offline event so it doesn't flicker on first
 * paint while navigator.onLine is still settling.
 */
export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [seenAnyEvent, setSeenAnyEvent] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => {
      setSeenAnyEvent(true);
      setOffline(!navigator.onLine);
    };
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (!seenAnyEvent || !offline) return null;

  return (
    <div
      role="status"
      className="fixed left-2 right-2 z-50 border border-accent/40 bg-bg p-2.5 text-[12px] fade-in"
      style={{
        top: 'calc(env(safe-area-inset-top) + 8px)',
        background: '#1a0d0d',
      }}
    >
      <p className="serif text-ink leading-snug">
        <span className="text-accent caps small-label mr-1.5" style={{ letterSpacing: '0.18em' }}>
          offline
        </span>
        Your chart, arcs, and polarity still work. New daily readings will
        load once you reconnect.
      </p>
    </div>
  );
}
