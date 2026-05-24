'use client';

import { useEffect, useState } from 'react';

const DISMISS_KEY = 'liraydhas.ath.dismissed.v1';

/**
 * Shows a small bottom-aligned banner on iPhone Safari (not standalone)
 * recommending "Add to Home Screen". Dismissed permanently via localStorage.
 */
export default function AddToHomeScreen() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = window.localStorage.getItem(DISMISS_KEY) === '1';
    if (dismissed) return;
    const ua = window.navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    // navigator.standalone is iOS-specific
    const isStandalone =
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
    if (isIOS && isSafari && !isStandalone) {
      // Delay a couple seconds so it doesn't compete with page load.
      const t = setTimeout(() => setVisible(true), 2500);
      return () => clearTimeout(t);
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed left-2 right-2 z-50 border border-hairline bg-bg p-3 text-[12px]"
      style={{
        bottom: 'calc(72px + env(safe-area-inset-bottom))',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-ink-dim leading-snug serif">
          Add Liraydhas to your home screen: tap{' '}
          <span className="text-ink">share</span> in Safari, then{' '}
          <span className="text-ink">Add to Home Screen</span>.
        </p>
        <button
          onClick={() => {
            window.localStorage.setItem(DISMISS_KEY, '1');
            setVisible(false);
          }}
          className="small-label caps text-ink-faint hover:text-ink"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
