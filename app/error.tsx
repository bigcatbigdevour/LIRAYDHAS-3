'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Next.js App Router error boundary for any client-side render error
 * inside a route. Server errors fall through to global-error.tsx, but
 * most user-facing crashes will land here.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console for dev. A real telemetry pipeline would go here.
    console.error('[route error]', error);
  }, [error]);

  return (
    <main className="page max-w-md mx-auto fade-in min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-8">
        {/* A small "fault line" atmospheric mark — a circle interrupted
            by a single break, voice-matched to the calm-fault feeling. */}
        <svg viewBox="0 0 80 80" className="w-16 h-16" aria-hidden>
          <circle cx="40" cy="40" r="30" fill="none" stroke="#f4f1ea" strokeWidth="0.5" opacity="0.45" />
          <path d="M 20 40 L 36 40 M 44 40 L 60 40" stroke="#8b3a3a" strokeWidth="0.8" opacity="0.85" />
          <path d="M 36 30 L 44 50" stroke="#8b3a3a" strokeWidth="0.8" opacity="0.85" />
        </svg>
        <div>
          <p
            className="small-label caps text-ink-faint"
            style={{ letterSpacing: '0.22em' }}
          >
            something broke
          </p>
          <h1
            className="h-display serif mt-3"
            style={{ fontSize: 'clamp(1.8rem, 6vw, 2.4rem)', lineHeight: 1.2 }}
          >
            A small fault.
          </h1>
        </div>
        <p className="serif text-[14.5px] text-ink-dim leading-relaxed max-w-xs">
          This page hit something it didn't expect. Your saved journal and
          chart are fine — they live separately.
        </p>
        {error.digest && (
          <p className="small-label caps text-ink-faint text-[10px]" style={{ letterSpacing: '0.18em' }}>
            ref · {error.digest}
          </p>
        )}
      </div>
      <div className="pb-8 space-y-2">
        <button
          onClick={() => reset()}
          className="btn-ghost block w-full text-left"
        >
          try again
        </button>
        <Link href="/today" className="btn-ghost block">go to today →</Link>
        <Link href="/about" className="btn-ghost block">about →</Link>
      </div>
    </main>
  );
}
