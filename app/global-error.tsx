'use client';

/**
 * Root error boundary — catches crashes in the root layout itself.
 * app/error.tsx only handles errors inside route segments; if layout.tsx
 * fails (e.g. the providers throw), Next.js falls all the way through to
 * this file. Without it the user would see the bare Next.js default
 * stack trace, which looks broken and leaks build info.
 *
 * Must define its own <html>/<body> because the root layout's failed
 * to render. Inline styles only — no Tailwind class processing can be
 * relied on here.
 */

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[global error]', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: 'ui-serif, Georgia, serif',
          background: '#0e0e0e',
          color: '#f4f1ea',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '2rem',
        }}
      >
        <svg viewBox="0 0 80 80" width="64" height="64" aria-hidden style={{ marginBottom: '1.5rem' }}>
          <circle cx="40" cy="40" r="30" fill="none" stroke="#f4f1ea" strokeWidth="0.5" opacity="0.45" />
          <path d="M 20 40 L 36 40 M 44 40 L 60 40" stroke="#8b3a3a" strokeWidth="0.8" opacity="0.85" />
          <path d="M 36 30 L 44 50" stroke="#8b3a3a" strokeWidth="0.8" opacity="0.85" />
        </svg>
        <p
          style={{
            fontSize: '10px',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#8a8a85',
            margin: 0,
          }}
        >
          something broke
        </p>
        <h1
          style={{
            fontFamily: 'ui-serif, Georgia, serif',
            fontSize: '1.8rem',
            margin: '0.75rem 0 1.5rem',
            fontWeight: 400,
          }}
        >
          A deep fault.
        </h1>
        <p
          style={{
            fontSize: '14px',
            color: '#c2c0b8',
            maxWidth: '20rem',
            lineHeight: 1.55,
            margin: '0 0 2rem',
          }}
        >
          The app couldn't start. Your saved journal and chart live
          locally on this device — they're safe.
        </p>
        {error.digest && (
          <p style={{ fontSize: '10px', letterSpacing: '0.18em', color: '#5a5a55', margin: '0 0 1.5rem' }}>
            ref · {error.digest}
          </p>
        )}
        <button
          onClick={() => reset()}
          style={{
            background: 'transparent',
            border: '1px solid #2b2b2b',
            color: '#f4f1ea',
            padding: '0.6rem 1.2rem',
            fontSize: '13px',
            letterSpacing: '0.06em',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          try again
        </button>
      </body>
    </html>
  );
}
