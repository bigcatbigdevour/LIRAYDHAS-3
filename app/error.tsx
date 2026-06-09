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
    <main className="page max-w-md mx-auto fade-in">
      <header className="pb-6">
        <p className="small-label caps">Something broke</p>
        <h1 className="h-display serif mt-3">A small fault.</h1>
      </header>
      <p className="serif text-[14.5px] text-ink-dim leading-relaxed">
        This page hit something it didn't expect. Your saved journal and
        chart are fine — they live separately.
      </p>
      {error.digest && (
        <p className="small-label caps text-ink-faint mt-3" style={{ letterSpacing: '0.14em' }}>
          ref · {error.digest}
        </p>
      )}
      <div className="mt-8 space-y-2">
        <button onClick={() => reset()} className="btn-ghost block w-full text-left">
          try again
        </button>
        <Link href="/today" className="btn-ghost block">go to today →</Link>
        <Link href="/about" className="btn-ghost block">about →</Link>
      </div>
    </main>
  );
}
