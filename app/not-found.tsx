import Link from 'next/link';

export const metadata = { title: 'Not here' };

export default function NotFound() {
  return (
    <main className="page max-w-md mx-auto fade-in">
      <header className="pb-6">
        <p className="small-label caps">404</p>
        <h1 className="h-display serif mt-3">Not here.</h1>
      </header>
      <p className="serif text-[14.5px] text-ink-dim leading-relaxed">
        The page you tried to reach doesn't exist — or used to, and doesn't
        anymore. No data was lost.
      </p>
      <div className="mt-8 space-y-2">
        <Link href="/today" className="btn-ghost block">today →</Link>
        <Link href="/saved" className="btn-ghost block">saved →</Link>
        <Link href="/about" className="btn-ghost block">about →</Link>
      </div>
    </main>
  );
}
