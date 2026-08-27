import Link from 'next/link';

export const metadata = { title: 'Not here' };

export default function NotFound() {
  return (
    <main className="page max-w-md mx-auto fade-in min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-8">
        {/* A small concentric atmospheric mark — same family as the
            onboarding intro. Lower opacity so the page feels quiet. */}
        <svg viewBox="0 0 80 80" className="w-16 h-16" aria-hidden>
          <circle cx="40" cy="40" r="34" fill="none" stroke="#f4f1ea" strokeWidth="0.5" opacity="0.3" />
          <circle cx="40" cy="40" r="22" fill="none" stroke="#f4f1ea" strokeWidth="0.4" opacity="0.45" />
          <circle cx="40" cy="40" r="10" fill="none" stroke="#f4f1ea" strokeWidth="0.4" opacity="0.6" />
          <line x1="20" y1="20" x2="60" y2="60" stroke="#8b3a3a" strokeWidth="0.6" opacity="0.7" />
          <line x1="60" y1="20" x2="20" y2="60" stroke="#8b3a3a" strokeWidth="0.6" opacity="0.7" />
        </svg>
        <div>
          <p
            className="small-label caps text-ink-faint"
            style={{ letterSpacing: '0.22em' }}
          >
            404 · not here
          </p>
          <h1
            className="h-display serif mt-3"
            style={{ fontSize: 'clamp(1.8rem, 6vw, 2.4rem)', lineHeight: 1.2 }}
          >
            Nothing at this address.
          </h1>
        </div>
        <p className="serif text-[14.5px] text-ink-dim leading-relaxed max-w-xs">
          The page you tried to reach doesn't exist — or used to, and
          doesn't anymore. No data was lost.
        </p>
      </div>
      <div className="pb-8 space-y-2">
        <Link href="/today" className="btn-ghost block">today →</Link>
        <Link href="/saved" className="btn-ghost block">saved →</Link>
        <Link href="/about" className="btn-ghost block">about →</Link>
      </div>
    </main>
  );
}
