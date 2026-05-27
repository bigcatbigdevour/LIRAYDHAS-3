'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import PolarityBars from '@/components/PolarityBars';
import ScrollHint from '@/components/ScrollHint';
import { CYCLES, ageInYears, positionInCycles, upcomingReturns, polarityFlips } from '@/lib/cycles';
import { POLARITY_LENSES } from '@/lib/polarityLenses';
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
        <p className="serif text-[15px] text-ink-dim mt-3 leading-relaxed">
          Every major cycle in a human life has a polarity — a first half
          that is rising, building, opening, and a second half that is
          descending, completing, releasing. Most people live their whole
          lives inside these tides without knowing when they flip.
        </p>
        <p className="text-ink-dim text-[13px] mt-3">
          Right now: <span className="text-ink">{positive} cycles rising · {negative} descending</span> — {stack}.
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
        <ScrollHint label="tap a bar · or scroll" />
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

      {/* Always-visible key explaining the bars */}
      <section className="mt-12 border-t border-hairline pt-6">
        <h2 className="h-display serif mb-3" style={{ fontSize: '1.4rem' }}>
          How to read this.
        </h2>
        <ul className="space-y-2 text-[13.5px] text-ink-dim serif leading-relaxed">
          <li>
            <span className="text-ink">Each bar</span> is one cycle of your life.
            Solar is a year. Mars is two. Saturn is twenty-nine and a half.
          </li>
          <li>
            <span className="text-ink">Each cycle has two halves.</span> The
            first half is rising — building, opening, gathering. The second
            half is descending — completing, releasing, letting go.
          </li>
          <li>
            <span className="text-ink">The colored fill</span> shows the half
            you are inside. The thin vertical line marks where in that half
            you are right now.
          </li>
          <li>
            <span className="text-ink">The flip dates underneath</span> tell
            you exactly when you crossed into this half and when you will
            cross out of it.
          </li>
          <li>
            <span className="text-ink">Read the stack as one weather.</span>{' '}
            Mostly rising = an opening season of your life. Mostly descending
            = a releasing one. A recent flip in a major cycle (Saturn, Nodal,
            Chiron) is rarely subtle.
          </li>
        </ul>
      </section>

      {/* Cycle-by-cycle deep dive */}
      <section className="mt-12 space-y-10">
        <h2 className="h-display serif" style={{ fontSize: '1.4rem' }}>
          Each cycle, in depth.
        </h2>
        {CYCLES.map((c) => {
          const lens = POLARITY_LENSES[c.key];
          if (!lens) return null;
          const pos = positions.find((p) => p.cycle.key === c.key);
          const flip = flips.find((f) => f.cycle.key === c.key);
          return (
            <article key={c.key}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-4 h-px" style={{ background: c.color }} />
                  <h3 className="serif text-[19px] text-ink">{c.label}</h3>
                </div>
                {pos && (
                  <span className="small-label caps text-ink-faint">
                    {pos.positive ? 'rising' : 'descending'} · {Math.round(pos.fraction * 100)}%
                  </span>
                )}
              </div>
              <dl className="space-y-3">
                <div>
                  <dt className="small-label caps text-ink-faint">
                    {pos?.positive ? 'inside this rising half' : 'inside this descending half'}
                  </dt>
                  <dd className="serif text-[14px] text-ink mt-0.5 leading-relaxed">
                    {pos?.positive ? lens.inRising : lens.inDescending}
                  </dd>
                </div>
                <div>
                  <dt className="small-label caps text-ink-faint">
                    {pos?.positive ? 'when this half ends' : 'when this half ends'}
                  </dt>
                  <dd className="serif text-[14px] text-ink-dim mt-0.5 leading-relaxed">
                    {pos?.positive ? lens.inDescending : lens.inRising}
                  </dd>
                </div>
                <div>
                  <dt className="small-label caps text-ink-faint">flip signals</dt>
                  <dd className="serif text-[14px] text-ink-dim mt-0.5 leading-relaxed">
                    {lens.flipSignals}
                  </dd>
                </div>
                <div>
                  <dt className="small-label caps text-ink-faint">pairings</dt>
                  <dd className="serif text-[14px] text-ink-dim mt-0.5 leading-relaxed">
                    {lens.pairings}
                  </dd>
                </div>
                {flip && (
                  <p className="small-label caps text-ink-faint mt-2" style={{ letterSpacing: '0.06em' }}>
                    flipped {Math.round(flip.daysSinceStart)} days ago ·{' '}
                    next flip in {Math.round(flip.daysUntilEnd)} days
                  </p>
                )}
              </dl>
            </article>
          );
        })}
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
