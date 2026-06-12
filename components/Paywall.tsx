'use client';

import { useState } from 'react';
import {
  PRODUCT_IDS,
  purchase,
  restore,
  startLocalTrial,
  trialUsed,
  useSubState,
  isPro,
  TRIAL_DAYS,
} from '@/lib/subscription';
import { Capacitor } from '@capacitor/core';
import { tap as hapticTap, success as hapticSuccess } from '@/lib/haptics';
import { announce } from './Announcer';

interface Props {
  /** Caller-supplied headline above the feature list. */
  headline?: string;
  /** Optional feature list. Defaults to the standard Pro features. */
  features?: string[];
  /** Optional callback fired after successful subscribe / restore. */
  onUnlocked?: () => void;
}

const DEFAULT_FEATURES = [
  'Ask the day — chart-grounded answers to your one-line questions.',
  'Compatibility readings for as many partners as you want.',
  'Unlimited photos and voice notes attached to journal entries.',
  'Year-ahead reading whenever you ask for it.',
  'Daily push reminders at your preferred local hour.',
  'Everything you save stays on your device, forever.',
];

/**
 * Paywall sheet — used inside ProGate and the /pro page. Renders a
 * voice-matched panel listing the Pro features, two SKU buttons
 * (annual + monthly), a "Restore" link, and an optional 7-day soft
 * trial that doesn't go through StoreKit (deliberately not Apple's
 * "Free Trial" subscription perk — that requires native purchase first).
 *
 * Calls into lib/subscription.ts. Real StoreKit wiring (RevenueCat or
 * @capacitor-community/in-app-purchases) goes inside purchase() —
 * this UI doesn't need to change when the plugin is added.
 */
export default function Paywall({ headline, features, onUnlocked }: Props) {
  const sub = useSubState();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const items = features ?? DEFAULT_FEATURES;
  const native = Capacitor.isNativePlatform();
  const canTrial = !trialUsed() && sub.kind === 'free';

  async function onBuy(productId: string) {
    if (busy) return;
    setBusy(productId);
    setMsg(null);
    hapticTap('medium');
    const r = await purchase(productId as (typeof PRODUCT_IDS)[keyof typeof PRODUCT_IDS]);
    if (r.ok) {
      hapticSuccess();
      announce('subscription active');
      onUnlocked?.();
    } else {
      setMsg(r.reason);
    }
    setBusy(null);
  }

  async function onRestore() {
    if (busy) return;
    setBusy('restore');
    setMsg(null);
    hapticTap('light');
    const r = await restore();
    if (r.ok) {
      if (r.restored) {
        hapticSuccess();
        announce('subscription restored');
        onUnlocked?.();
        setMsg('Welcome back.');
      } else {
        setMsg('No prior purchase found on this Apple ID.');
      }
    } else {
      setMsg(r.reason);
    }
    setBusy(null);
  }

  function onTrial() {
    hapticSuccess();
    if (startLocalTrial()) {
      announce(`free trial started, ${TRIAL_DAYS} days`);
      setMsg(`${TRIAL_DAYS} days unlocked. Subscribe before it ends to keep going.`);
      onUnlocked?.();
    }
  }

  if (isPro(sub)) {
    return (
      <section className="border-l-2 border-accent pl-3 py-2">
        <p
          className="small-label caps text-accent"
          style={{ letterSpacing: '0.18em' }}
        >
          {sub.kind === 'trial' ? 'pro · trial' : 'pro'}
        </p>
        <p className="text-[13.5px] text-ink-dim serif mt-1 leading-relaxed">
          You have access to everything.{' '}
          {sub.kind === 'trial' && (
            <>
              Trial ends{' '}
              <span className="text-ink">
                {new Date(sub.expiresAt).toLocaleDateString()}
              </span>.
            </>
          )}
        </p>
      </section>
    );
  }

  return (
    <section className="border border-accent p-4">
      <p
        className="small-label caps text-accent mb-2"
        style={{ letterSpacing: '0.22em' }}
      >
        liraydhas pro
      </p>
      {headline && (
        <h3 className="serif text-ink text-[16px] mb-3 leading-snug">{headline}</h3>
      )}
      <ul className="space-y-2 text-[13.5px] text-ink-dim serif mb-4">
        {items.map((f, i) => (
          <li key={i} className="flex gap-2 leading-relaxed">
            <span className="text-accent" aria-hidden>·</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => onBuy(PRODUCT_IDS.annual)}
          disabled={!!busy}
          className="btn-primary w-full"
        >
          {busy === PRODUCT_IDS.annual ? 'opening App Store…' : 'subscribe yearly · best value'}
        </button>
        <button
          type="button"
          onClick={() => onBuy(PRODUCT_IDS.monthly)}
          disabled={!!busy}
          className="btn-ghost w-full"
        >
          {busy === PRODUCT_IDS.monthly ? 'opening App Store…' : 'subscribe monthly'}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 items-center justify-between">
        {canTrial && (
          <button
            type="button"
            onClick={onTrial}
            className="small-label caps text-ink-faint hover:text-ink"
            style={{ letterSpacing: '0.16em' }}
          >
            try {TRIAL_DAYS} days free →
          </button>
        )}
        <button
          type="button"
          onClick={onRestore}
          disabled={!!busy}
          className="small-label caps text-ink-faint hover:text-ink"
          style={{ letterSpacing: '0.16em' }}
        >
          {busy === 'restore' ? 'restoring…' : 'restore purchases'}
        </button>
      </div>

      {msg && (
        <p
          className="small-label caps text-ink-dim text-[10px] mt-3"
          style={{ letterSpacing: '0.14em' }}
        >
          {msg}
        </p>
      )}

      {!native && (
        <p
          className="small-label caps text-ink-faint text-[10px] mt-3 italic"
          style={{ letterSpacing: '0.14em' }}
        >
          subscription purchases live inside the iOS app
        </p>
      )}

      <p
        className="text-[10.5px] text-ink-faint serif italic mt-4 leading-relaxed"
      >
        Auto-renews until cancelled in your Apple ID Subscriptions
        settings. Cancel anytime to keep the rest of the month / year
        you&apos;ve already paid for.
      </p>
    </section>
  );
}
