'use client';

import { useEffect, useState } from 'react';

/**
 * Live region for screen readers — when an action happens that VoiceOver
 * users should hear ("saved", "copied", "removed"), call announce().
 * The message is read out by the OS, then cleared after a short window
 * so the next announcement re-triggers even if it has the same text.
 *
 * Mounted once in the root layout. Listens for a custom window event
 * (`liraydhas:announce`) so any component can fire one without prop-
 * drilling a callback. Pattern:
 *
 *   import { announce } from '@/components/Announcer';
 *   announce('saved');
 */
export default function Announcer() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    const onAnnounce = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail !== 'string' || !detail) return;
      setMessage(''); // force re-trigger if same text
      // Microtask: set message after React clears it so the live region
      // sees a fresh value and announces.
      Promise.resolve().then(() => setMessage(detail));
      // Clear after 2.5s so it's gone before the next state change.
      window.setTimeout(() => setMessage(''), 2500);
    };
    window.addEventListener('liraydhas:announce', onAnnounce);
    return () => window.removeEventListener('liraydhas:announce', onAnnounce);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

/** Convenience helper — fires the custom event. SSR-safe. */
export function announce(message: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('liraydhas:announce', { detail: message }));
}
