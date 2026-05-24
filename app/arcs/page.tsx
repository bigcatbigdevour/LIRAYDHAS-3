'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import ArcDiagram from '@/components/ArcDiagram';

export default function ArcsPage() {
  const router = useRouter();
  const blueprint = useStore((s) => s.blueprint);

  useEffect(() => {
    const t = setTimeout(() => { if (!blueprint) router.replace('/onboarding'); }, 60);
    return () => clearTimeout(t);
  }, [blueprint, router]);

  if (!blueprint) return null;

  return (
    <main className="page max-w-3xl mx-auto fade-in">
      <header className="pb-6">
        <p className="small-label caps">Arcs</p>
        <h1 className="h-display serif mt-3">Every cycle, drawn.</h1>
        <p className="text-ink-dim text-[13px] mt-2 max-w-md">
          Each tick is a return of a cycle. Each thin arc connects two consecutive
          returns. The white line is where you are right now.
        </p>
      </header>

      <section className="mt-6">
        <ArcDiagram birthIso={blueprint.birth.iso} />
      </section>
    </main>
  );
}
