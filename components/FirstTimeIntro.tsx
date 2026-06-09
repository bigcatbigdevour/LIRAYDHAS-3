'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * Dismissable "first time here? read this once" callout. Each invocation
 * is keyed by `storeKey` so /today's intro can be dismissed independently
 * of /arcs's intro, etc.
 *
 * Design intent: a returning user should NEVER see this. The component
 * renders null after dismissal — no persistent "reopen" button — so the
 * tabs feel like quick check-ins, not a tutorial. If users want a refresher
 * they can open /learn (always one tap away from the global nav).
 *
 * SSR note: rendering is gated on `mounted` so the server output (which
 * cannot know localStorage) doesn't briefly flash an explainer that the
 * user has already dismissed.
 */
export default function FirstTimeIntro({
  storeKey,
  title = 'first time here? read this once',
  children,
  learnHref,
}: {
  storeKey: string;
  title?: string;
  children: React.ReactNode;
  /** Optional `/learn#section` deep link. */
  learnHref?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setMounted(true);
    if (window.localStorage.getItem(storeKey) === '1') {
      setOpen(false);
    }
  }, [storeKey]);

  if (!mounted) return null;
  if (!open) return null;

  return (
    <div className="mt-3 border-l-2 border-accent pl-3 py-2 max-w-md fade-in">
      <p className="small-label caps text-accent" style={{ letterSpacing: '0.16em' }}>
        {title}
      </p>
      <div className="text-[13.5px] text-ink-dim serif mt-2 leading-relaxed space-y-2">
        {children}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[11px] caps" style={{ letterSpacing: '0.16em' }}>
        {learnHref && (
          <Link href={learnHref} className="text-accent hover:underline">
            deeper guide →
          </Link>
        )}
        <button
          type="button"
          onClick={() => {
            window.localStorage.setItem(storeKey, '1');
            setOpen(false);
          }}
          className="text-ink-faint hover:text-ink"
        >
          got it
        </button>
      </div>
    </div>
  );
}

