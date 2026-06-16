/**
 * Subscription / IAP scaffold for the iOS App Store version.
 *
 * Status: scaffold. Real native purchase calls require a Capacitor IAP
 * plugin (RevenueCat is the simplest; @capacitor-community/in-app-
 * purchases is the open-source path). This module abstracts the surface
 * so swapping in the real plugin later is a one-file change. Until then,
 * subscribe() / restore() write a local "subscribed" flag and the rest
 * of the app gates features on it.
 *
 * On the web (Capacitor.isNativePlatform() is false), IAP is N/A —
 * Apple forbids alternate payment for digital goods on iOS, and we
 * don't ship a web payment flow yet. Subscribe just becomes a noop;
 * the user has to subscribe inside the iOS app to unlock pro features.
 *
 * Privacy: the local "Pro" flag is stored in localStorage. The server
 * does NOT see who subscribed unless validate() is called — and validate
 * sends only the App Store Server transaction id + receipt, nothing
 * personal. Receipts are anonymous from the receipt's point of view;
 * Apple ties them to the user's Apple ID server-side but never exposes
 * that mapping to the developer.
 */

import { Capacitor } from '@capacitor/core';

/**
 * Stable product IDs that need to be created in App Store Connect →
 * In-App Purchases. Each product needs:
 *   · Type: Auto-Renewable Subscription
 *   · Subscription group (one shared group: "Liraydhas Pro")
 *   · Price tier (annual is best value, monthly available)
 *   · Localized name + description (set in App Store Connect)
 *   · Apple's review screenshots of the paywall surface
 */
export const PRODUCT_IDS = {
  monthly: 'com.liraydhas.app.pro.monthly',
  annual: 'com.liraydhas.app.pro.annual',
} as const;
export type ProductId = (typeof PRODUCT_IDS)[keyof typeof PRODUCT_IDS];

const STORE_KEY = 'liraydhas.subscription.v1';

export type SubState =
  | { kind: 'free' }
  | { kind: 'trial'; expiresAt: number /* epoch ms */ }
  | { kind: 'pro'; productId: ProductId; renewsAt?: number };

interface StoredSub {
  state: SubState;
  /** Most recent "this is now your status" timestamp — for diagnostics. */
  updatedAt: number;
}

function safeRead(): StoredSub | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSub;
    if (parsed && parsed.state && typeof parsed.updatedAt === 'number') return parsed;
    return null;
  } catch {
    return null;
  }
}

function safeWrite(s: StoredSub): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {/* quota etc */}
}

export function readSubState(): SubState {
  const stored = safeRead();
  if (!stored) return { kind: 'free' };
  // Expire trials lazily on read so the UI can treat a stale trial as
  // free without an explicit migration step.
  if (stored.state.kind === 'trial' && stored.state.expiresAt < Date.now()) {
    safeWrite({ state: { kind: 'free' }, updatedAt: Date.now() });
    return { kind: 'free' };
  }
  return stored.state;
}

export function isPro(s?: SubState): boolean {
  const state = s ?? readSubState();
  return state.kind === 'pro' || state.kind === 'trial';
}

/**
 * Set the local subscription state. Called by both the IAP purchase
 * callback (when the user subscribes natively) and by the server
 * validation response.
 */
export function setSubState(state: SubState): void {
  safeWrite({ state, updatedAt: Date.now() });
  // Notify the app so any component watching can re-render.
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('liraydhas:sub-changed', { detail: state }));
  }
}

/**
 * Start a 7-day free trial. The trial state is stored locally only —
 * not actually a StoreKit trial, just a soft preview before the user
 * has to subscribe. Set once per device.
 */
const TRIAL_KEY = 'liraydhas.subscription.trialUsed.v1';
export const TRIAL_DAYS = 7;

export function startLocalTrial(): boolean {
  if (typeof window === 'undefined') return false;
  // Guard every localStorage call — iOS Private Browsing and full-quota
  // states throw on access. A trial that fails silently is better than
  // a paywall page that crashes when the user taps "try it".
  try {
    if (window.localStorage.getItem(TRIAL_KEY) === '1') return false;
  } catch {
    return false;
  }
  const expiresAt = Date.now() + TRIAL_DAYS * 86400_000;
  setSubState({ kind: 'trial', expiresAt });
  try {
    window.localStorage.setItem(TRIAL_KEY, '1');
  } catch {/* trial state is already in safeWrite-backed sub store */}
  return true;
}

export function trialUsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(TRIAL_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Trigger a purchase. On a native iOS shell this routes through the
 * StoreKit plugin; on web it's a no-op that returns false. Real
 * implementation replaces the inner block with a plugin call (RevenueCat
 * or @capacitor-community/in-app-purchases).
 */
export async function purchase(productId: ProductId): Promise<
  { ok: true } | { ok: false; reason: string }
> {
  if (!Capacitor.isNativePlatform()) {
    return { ok: false, reason: 'Subscribe inside the iOS app to unlock Pro.' };
  }
  // TODO replace stub with the chosen plugin's `purchase(productId)`.
  // Recommended: RevenueCat. Installation:
  //   npm install @revenuecat/purchases-capacitor
  //   import { Purchases } from '@revenuecat/purchases-capacitor';
  //   await Purchases.configure({ apiKey: 'PUBLIC_REVENUECAT_KEY' });
  //   const offerings = await Purchases.getOfferings();
  //   await Purchases.purchasePackage({ aPackage: pkg });
  //   const info = await Purchases.getCustomerInfo();
  //   if (info.customerInfo.entitlements.active['pro']) {
  //     setSubState({ kind: 'pro', productId });
  //     return { ok: true };
  //   }
  console.warn('[iap] purchase() stubbed — wire RevenueCat or community plugin');
  setSubState({ kind: 'pro', productId });
  return { ok: true };
}

/**
 * Restore previously-purchased subscription. Required by App Store
 * guideline 3.1.1 — every paid app must have a "Restore Purchases"
 * affordance.
 */
export async function restore(): Promise<
  { ok: true; restored: boolean } | { ok: false; reason: string }
> {
  if (!Capacitor.isNativePlatform()) {
    return { ok: false, reason: 'Restore is only available in the iOS app.' };
  }
  // TODO: RevenueCat -- await Purchases.restorePurchases();
  // Then read customerInfo.entitlements and call setSubState.
  console.warn('[iap] restore() stubbed — wire RevenueCat or community plugin');
  return { ok: true, restored: false };
}

/**
 * Hook helper: keep a component re-rendered on subscription-change
 * events. Pure event subscription so SSR works.
 */
import { useEffect, useState } from 'react';
export function useSubState(): SubState {
  // Always start with the "free" baseline so server-rendered HTML
  // matches the client's first paint. Then read the real state in an
  // effect — any mismatch (user is actually on Pro) gets corrected in
  // the next commit without triggering React's hydration warning.
  const [state, setState] = useState<SubState>({ kind: 'free' });
  useEffect(() => {
    setState(readSubState());
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<SubState>).detail;
      if (detail) setState(detail);
      else setState(readSubState());
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORE_KEY) setState(readSubState());
    };
    window.addEventListener('liraydhas:sub-changed', onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('liraydhas:sub-changed', onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return state;
}
