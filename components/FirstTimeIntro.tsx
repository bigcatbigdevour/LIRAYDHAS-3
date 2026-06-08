'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * Dismissable "first time here? read this once" callout. Each invocation
 * is keyed by `storeKey` so /today's intro can be dismissed independently
 * of /arcs's intro, etc. After dismissal, a tiny re-open link sits in its
 * place so the explainer is never permanently gone.
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
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(storeKey) !== '1';
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="small-label caps text-ink-faint hover:text-ink mt-3"
        style={{ letterSpacing: '0.16em' }}
      >
        + first time here?
      </button>
    );
  }

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
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(storeKey, '1');
            }
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
