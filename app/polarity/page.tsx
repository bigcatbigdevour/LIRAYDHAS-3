'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import PolarityBars from '@/components/PolarityBars';
import { ageInYears, positionInCycles, upcomingReturns, polarityFlips } from '@/lib/cycles';
import type { PolarityReading } from '@/lib/types';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function PolarityPage() {
  const router = useRouter();
  const blueprint = useStore((s) => s.blueprint);
  const polarity = useStore((s) => s.polarity);
  const setPolarity = useStore((s) => s.setPolarity);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { if (!blueprint) router.replace('/onboarding'); }, 60);
    return () => clearTimeout(t);
  }, [blueprint, router]);

  const positions = useMemo(() => {
    if (!blueprint) return [];
    const age = ageInYears(blueprint.birth.iso);
    return positionInCycles(age);
  }, [blueprint]);

  const upcoming = useMemo(() => {
    if (!blueprint) return [];
    return upcomingReturns(blueprint.birth.iso);
  }, [blueprint]);

  const flips = useMemo(() => {
    if (!blueprint) return [];
    return polarityFlips(blueprint.birth.iso);
  }, [blueprint]);

  const mostRecentFlip = useMemo(() => {
    if (flips.length === 0) return null;
    return [...flips].sort((a, b) => a.daysSinceStart - b.daysSinceStart)[0];
  }, [flips]);

  const nextFlip = useMemo(() => {
    if (flips.length === 0) return null;
    return [...flips].sort((a, b) => a.daysUntilEnd - b.daysUntilEnd)[0];
  }, [flips]);

  const fresh = useMemo(() => {
    if (!polarity) return false;
    return Date.now() - new Date(polarity.generatedAt).getTime() < WEEK_MS;
  }, [polarity]);

  useEffect(() => {
    if (!blueprint || fresh) return;
    void fetchPolarity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blueprint, fresh]);

  async function fetchPolarity() {
    if (!blueprint) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/polarity', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ blueprint }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `error ${res.status}`);
      }
      const data = (await res.json()) as PolarityReading;
      setPolarity(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'failed');
    } finally {
      setLoading(false);
    }
  }

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
        {(mostRecentFlip || nextFlip) && (
          <div className="mt-3 grid grid-cols-2 gap-x-3 text-[11px]" style={{ letterSpacing: '0.06em' }}>
            {mostRecentFlip && (
              <p className="text-ink-faint">
                last flip · <span className="text-ink">{mostRecentFlip.cycle.label.toLowerCase()}</span>
                <br />
                <span className="small-label caps">
                  {Math.round(mostRecentFlip.daysSinceStart)} days ago →{' '}
                  {mostRecentFlip.positive ? 'rising' : 'descending'}
                </span>
              </p>
            )}
            {nextFlip && (
              <p className="text-ink-faint text-right">
                next flip · <span className="text-ink">{nextFlip.cycle.label.toLowerCase()}</span>
                <br />
                <span className="small-label caps">
                  in {Math.round(nextFlip.daysUntilEnd)} days →{' '}
                  {nextFlip.positive ? 'descending' : 'rising'}
                </span>
              </p>
            )}
          </div>
        )}
      </header>

      <section className="mt-6">
        <PolarityBars positions={positions} flips={flips} />
      </section>

      <section className="mt-10 border-t border-hairline pt-6">
        {loading && !polarity?.paragraph && (
          <p className="text-ink-dim italic">reading the stack…</p>
        )}
        {error && (
          <div>
            <p className="text-accent text-[13px]">{error}</p>
            <button className="btn-ghost mt-2" onClick={fetchPolarity}>retry</button>
          </div>
        )}
        {polarity?.paragraph && (
          <p className="body-prose serif text-ink">{polarity.paragraph}</p>
        )}
      </section>

      {upcoming.length > 0 && (
        <section className="mt-12 border-t border-hairline pt-6">
          <p className="small-label caps mb-3">next returns</p>
          <ul className="space-y-1">
            {upcoming.map((u) => (
              <li key={u.cycle.key} className="flex justify-between text-[13px] border-b border-hairline py-1">
                <span className="text-ink-dim">
                  <span className="inline-block w-2 h-px mr-2 align-middle" style={{ background: u.cycle.color }} />
                  {u.cycle.label}
                </span>
                <span className="tabular-nums text-ink">
                  {u.date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}{' '}
                  <span className="text-ink-faint">· age {u.ageAtReturn.toFixed(1)}</span>
                </span>
              </li>
            ))}
          </ul>
          <button
            className="btn-ghost mt-3"
            onClick={async () => {
              if (!blueprint) return;
              const res = await fetch('/api/calendar', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ blueprint }),
              });
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'liraydhas-returns.ics';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
          >
            download calendar (.ics)
          </button>
        </section>
      )}

      <section className="mt-6">
        <button className="btn-ghost" onClick={fetchPolarity} disabled={loading}>
          {loading ? 'refreshing…' : 'refresh interpretation'}
        </button>
      </section>
    </main>
  );
}
