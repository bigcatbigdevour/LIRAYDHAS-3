'use client';

import { useEffect, useState } from 'react';

/**
 * One-time, dismissable "add to home screen" nudge.
 *
 * Two paths:
 * 1. Chromium / Android exposes a `beforeinstallprompt` event we can capture
 *    and trigger via a button. The hint copy invites a tap.
 * 2. iOS Safari never fires that event but is the most common case for this
 *    audience. Detect iOS-without-standalone and show a copy line telling
 *    the user how to add the icon via the Share Sheet.
 *
 * Either way, dismissal is sticky (localStorage). Suppressed entirely when
 * already running standalone.
 */
// Reuse the existing dismiss key so users who already tapped "x" on the
// older iOS-only banner don't see the new one either.
const STORE_KEY = 'liraydhas.ath.dismissed.v1';

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function InstallHint() {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [isIosSafari, setIsIosSafari] = useState(false);

  useEffect(() => {
    setMounted(true);

    // If they've dismissed it before, never show it again. Guard the
    // localStorage read for iOS Private Browsing — there it throws
    // SecurityError and the bare access would crash this effect.
    try {
      if (window.localStorage.getItem(STORE_KEY) === '1') {
        setDismissed(true);
        return;
      }
    } catch { /* private browsing — treat as not dismissed */ }

    // Already installed → don't nudge.
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) {
      setDismissed(true);
      return;
    }

    // Running inside a Capacitor / Ionic native shell — telling the user
    // to use Safari's Share Sheet is meaningless. Skip the hint.
    const isCapacitor =
      window.location.protocol === 'capacitor:' ||
      window.location.protocol === 'ionic:' ||
      (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() === true ||
      (window as Window & { Capacitor?: unknown }).Capacitor != null;
    if (isCapacitor) {
      setDismissed(true);
      return;
    }

    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
    if (isIos && isSafari) {
      setIsIosSafari(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!mounted || dismissed) return null;
  if (!installEvent && !isIosSafari) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORE_KEY, '1');
    } catch { /* private browsing — at least dismiss for this session */ }
    setDismissed(true);
  };

  return (
    <div
      className="fixed bottom-[68px] left-3 right-3 z-40 border border-accent bg-bg p-3 max-w-md mx-auto fade-in"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      role="dialog"
      aria-label="add to home screen"
    >
      <p
        className="small-label caps text-accent"
        style={{ letterSpacing: '0.18em' }}
      >
        add to home screen
      </p>
      {installEvent && (
        <>
          <p className="serif text-[13.5px] text-ink-dim mt-1 leading-relaxed">
            One tap and Liraydhas becomes its own icon — no browser bar,
            opens faster, lives where the rest of your apps live.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 items-center">
            <button
              type="button"
              className="btn-ghost"
              onClick={async () => {
                try {
                  await installEvent.prompt();
                  await installEvent.userChoice;
                } finally {
                  dismiss();
                }
              }}
            >
              install
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="small-label caps text-ink-faint hover:text-ink"
            >
              not now
            </button>
          </div>
        </>
      )}
      {!installEvent && isIosSafari && (
        <>
          <p className="serif text-[13.5px] text-ink-dim mt-1 leading-relaxed">
            Tap{' '}
            <span aria-hidden className="inline-block translate-y-px">⎋</span>{' '}
            <span className="text-ink">Share</span> at the bottom of Safari,
            then{' '}
            <span className="text-ink">Add to Home Screen</span>. The app
            opens without browser chrome from then on.
          </p>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={dismiss}
              className="small-label caps text-ink-faint hover:text-ink"
            >
              got it
            </button>
          </div>
        </>
      )}
    </div>
  );
}
