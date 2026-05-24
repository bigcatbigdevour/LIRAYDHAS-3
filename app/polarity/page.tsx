'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import PolarityBars from '@/components/PolarityBars';
import { ageInYears, positionInCycles } from '@/lib/cycles';

export default function PolarityPage() {
  const router = useRouter();
  const blueprint = useStore((s) => s.blueprint);

  useEffect(() => {
    const t = setTimeout(() => { if (!blueprint) router.replace('/onboarding'); }, 60);
    return () => clearTimeout(t);
  }, [blueprint, router]);

  const positions = useMemo(() => {
    if (!blueprint) return [];
    const age = ageInYears(blueprint.birth.iso);
    return positionInCycles(age);
  }, [blueprint]);

  if (!blueprint) return null;

  const positive = positions.filter((p) => p.positive).length;
  const negative = positions.length - positive;
  const stack =
    positive > negative
      ? 'mostly opening'
      : positive < negative
        ? 'mostly closing'
        : 'evenly split';

  return (
    <main className="page max-w-md mx-auto fade-in">
      <header className="pb-6">
        <p className="small-label caps">Polarity</p>
        <h1 className="h-display serif mt-3">Where the tides are.</h1>
        <p className="text-ink-dim text-[13px] mt-2">
          {positive} cycles rising · {negative} descending — {stack}.
        </p>
      </header>

      <section className="mt-6">
        <PolarityBars positions={positions} />
      </section>

      <section className="mt-10 border-t border-hairline pt-6">
        <p className="body-prose serif text-ink-dim">
          A rising bar means you’re in the first half of that cycle — the part
          that builds, accumulates, opens. A descending bar means you’re in the
          second half — the part that releases, completes, lets go. Read the
          stack as a whole.
        </p>
      </section>
    </main>
  );
}
