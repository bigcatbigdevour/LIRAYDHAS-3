'use client';

import { useEffect } from 'react';
import { installNativeListeners, isNativeRuntime } from '@/lib/nativePush';
import { rescheduleAnniversaries } from '@/lib/localNotifications';

/**
 * Registers /sw.js on mount. Kept in its own component so the
 * registration call lives in a client boundary without bloating
 * the layout shell with unrelated logic.
 *
 * The service worker itself is responsible for caching the shell +
 * stale-while-revalidating LLM responses. See public/sw.js.
 *
 * Skipped in development — Next's HMR + the SW caches fight each other
 * and you end up debugging stale assets instead of code.
 */
export default function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Native iOS / Android (Capacitor): no service worker, but wire up
    // the APNs runtime listeners (foreground ping + background tap)
    // and refresh the anniversary local-notification schedule.
    if (isNativeRuntime()) {
      void installNativeListeners();
      // Reschedule on every launch so the OS-held schedule stays
      // current. Cheap (early-returns when the toggle is off).
      void rescheduleAnniversaries();
      // StoreKit: initialize the product catalog + transaction
      // listeners (catches unfinished purchases and renewals that
      // StoreKit replays at launch), then reconcile the stored
      // subscription against the server — renewals extend Pro,
      // lapses downgrade it. Dynamic import keeps this out of the
      // web bundle.
      void (async () => {
        try {
          const sk = await import('@/lib/iap/storekit');
          await sk.initStoreKit();
          await sk.revalidateNative();
        } catch (e) {
          console.warn('[iap] boot init failed:', e);
        }
      })();
      return;
    }

    // Web: register the service worker.
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((e) => {
          console.warn('[sw] registration failed:', e);
        });
    };
    // Defer until window.load so registration doesn't compete with the
    // first paint for the user's bandwidth.
    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
