'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import PolarityBars from '@/components/PolarityBars';
import PolarityForecast from '@/components/PolarityForecast';
import PullToRefresh from '@/components/PullToRefresh';
import FirstTimeIntro from '@/components/FirstTimeIntro';
import ScrollHint from '@/components/ScrollHint';
import { friendlyError } from '@/lib/friendlyError';
import { api } from '@/lib/apiBase';
import { tap as hapticTap } from '@/lib/haptics';
import Link from 'next/link';
import { CYCLES, ageInYears, positionInCycles, upcomingReturns, polarityFlips } from '@/lib/cycles';
import { POLARITY_LENSES } from '@/lib/polarityLenses';
import { LIFE_STATIONS } from '@/lib/lifeStations';
import { upcomingEventsFeed } from '@/lib/upcomingEvents';
import { currentChapter } from '@/lib/lifeChapters';
import { polarityGlanceText } from '@/lib/polarityGlance';
import { whereYouAre, prettyDays } from '@/lib/whereYouAre';
import { AUTHORITY_FOR_POLARITY } from '@/lib/humandesign/authorityForPolarity';
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

  const imminentFlips = useMemo(() => {
    return flips
      .filter((f) => f.daysUntilEnd <= 30)
      .sort((a, b) => a.daysUntilEnd - b.daysUntilEnd);
  }, [flips]);

  const recentFlips = useMemo(() => {
    return flips
      .filter((f) => f.daysSinceStart <= 30)
      .sort((a, b) => a.daysSinceStart - b.daysSinceStart);
  }, [flips]);

  const [forecastMonths, setForecastMonths] = useState(12);
  const [timelineRange, setTimelineRange] = useState<'1y' | '5y' | '20y'>('1y');

  const upcomingEvents = useMemo(() => {
    if (!blueprint) return [];
    const horizonYears = timelineRange === '1y' ? 1 : timelineRange === '5y' ? 5 : 20;
    return upcomingEventsFeed(blueprint.birth.iso, new Date(), { horizonYears }).slice(0, 60);
  }, [blueprint, timelineRange]);

  const currentStation = useMemo(() => {
    if (!blueprint) return null;
    const age = ageInYears(blueprint.birth.iso);
    // Find the nearest station within a 3-year window.
    let best = null as null | typeof LIFE_STATIONS[number] & { distance: number };
    for (const s of LIFE_STATIONS) {
      const distance = Math.abs(age - s.age);
      if (distance < 3 && (best === null || distance < best.distance)) {
        best = { ...s, distance };
      }
    }
    return best;
  }, [blueprint]);

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
    const startBlueprint = blueprint;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(api('/api/polarity'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ blueprint: startBlueprint }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `error ${res.status}`);
      }
      const data = (await res.json()) as PolarityReading;
      if (useStore.getState().blueprint !== startBlueprint) return;
      setPolarity(data);
    } catch (e: unknown) {
      setError(friendlyError(e instanceof Error ? e.message : null));
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
    <PullToRefresh onRefresh={fetchPolarity}>
    <main className="page max-w-md mx-auto fade-in">
      <header className="pb-6">
        <p className="small-label caps">Polarity</p>
        <h1 className="h-display serif mt-3">Where the tides are.</h1>
        <FirstTimeIntro storeKey="liraydhas.polarity.intro.dismissed.v1" learnHref="/learn#polarity">
          <p>
            Every planet's cycle has two halves. The first half is{' '}
            <span className="text-ink">rising</span> — energy building, things
            accumulating, doors opening. The second half is{' '}
            <span className="text-ink">descending</span> — completing, releasing,
            integrating. Most people live their whole lives inside these tides
            without noticing when one flips.
          </p>
          <p>
            Each bar below is one cycle. The <span className="text-ink">filled top half</span>{' '}
            means rising; the <span className="text-ink">filled bottom half</span> means
            descending. The thin vertical line shows where in that half you are right
            now. Tap any bar to read what its current half feels like.
          </p>
          <p>
            The slow ones (Saturn, Chiron, Nodal) are the ones to watch when they
            flip — those are not subtle.
          </p>
        </FirstTimeIntro>
        {(() => {
          const w = whereYouAre(blueprint);
          return (
            <div className="mt-3 border-l-2 border-accent pl-3 py-1.5">
              <p className="text-[15px] text-ink serif">
                You are <span className="text-accent">{w.ageYears.toFixed(2)} years old</span>.
                <span className="text-ink-dim"> · {w.ageDays.toLocaleString()} days alive.</span>
              </p>
              <p className="text-[12.5px] text-ink-dim serif mt-1 leading-relaxed">
                Next solar return: <span className="text-ink">{prettyDays(w.daysUntilSolarReturn)}</span> away.
                {w.nextStation && (
                  <> · Next life station ({w.nextStation.station.label.toLowerCase()}): <span className="text-ink">{prettyDays(w.nextStation.daysUntil)}</span> away.</>
                )}
                {w.lastStation && !w.nextStation && (
                  <> · Last life station ({w.lastStation.station.label.toLowerCase()}): <span className="text-ink">{prettyDays(w.lastStation.daysAgo)}</span> ago.</>
                )}
              </p>
            </div>
          );
        })()}
        {/* atmospheric one-liner: today's tide mood */}
        {(() => {
          let mood: string;
          if (positive >= 6) mood = 'almost everything opening';
          else if (positive === 5) mood = 'mostly opening';
          else if (positive === 4) mood = 'tilted toward opening';
          else if (positive === 3) mood = 'evenly held';
          else if (positive === 2) mood = 'tilted toward closing';
          else if (positive === 1) mood = 'mostly closing';
          else mood = 'almost everything releasing';
          return (
            <p className="serif italic text-[16px] text-ink mt-3">
              today the tide reads as <span className="text-accent">{mood}</span>.
            </p>
          );
        })()}
        <div className="text-ink-dim text-[13px] mt-4 flex items-baseline justify-between gap-3">
          <p>
            Right now: <span className="text-ink">{positive} cycles rising · {negative} descending</span> — {stack}.
          </p>
          <button
            type="button"
            className="small-label caps text-ink-faint hover:text-ink shrink-0"
            onClick={async () => {
              const age = ageInYears(blueprint.birth.iso).toFixed(1);
              const lines = [
                `My polarity at ${age}y: ${positive} rising · ${negative} descending.`,
                ...positions.map((p) => `  ${p.cycle.glyph} ${p.cycle.label}: ${p.positive ? '↑ rising' : '↓ descending'} ${Math.round(p.fraction * 100)}%`),
                mostRecentFlip ? `Last flip: ${mostRecentFlip.cycle.label.toLowerCase()} ${Math.round(mostRecentFlip.daysSinceStart)}d ago.` : '',
                nextFlip ? `Next flip: ${nextFlip.cycle.label.toLowerCase()} in ${Math.round(nextFlip.daysUntilEnd)}d.` : '',
              ].filter(Boolean).join('\n');
              try {
                if (navigator.share) {
                  await navigator.share({ title: 'My polarity', text: lines });
                } else {
                  await navigator.clipboard.writeText(lines);
                  const el = document.getElementById('polarity-share-toast');
                  if (el) {
                    el.style.opacity = '1';
                    window.setTimeout(() => { el.style.opacity = '0'; }, 1500);
                  }
                }
              } catch {/* user cancelled */}
            }}
          >
            share
          </button>
        </div>
        <div id="polarity-share-toast" className="small-label caps text-accent text-right" style={{ opacity: 0, transition: 'opacity 300ms ease', height: '1em' }}>
          copied
        </div>
        {/* Live-stack glance: a row of dots, one per cycle. Tap to scroll
            to that cycle's full bar below. */}
        <div className="mt-4 flex items-center gap-2" aria-label="Current polarity stack">
          {positions.map((p) => (
            <button
              key={p.cycle.key}
              type="button"
              className="flex flex-col items-center gap-0.5"
              title={`${p.cycle.label}: ${p.positive ? 'rising' : 'descending'} ${Math.round(p.fraction * 100)}%`}
              onClick={() => {
                const el = document.getElementById(`bar-${p.cycle.key}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
            >
              <span
                className={`block ${(p.fraction < 0.08 || p.fraction > 0.92) ? 'w-3 h-3' : 'w-2.5 h-2.5'} ${(p.fraction < 0.08 || p.fraction > 0.92) ? 'polarity-marker-pulse' : ''}`}
                style={{
                  background: p.cycle.color,
                  opacity: p.positive ? 0.95 : 0.35,
                }}
              />
              <span className="text-[8px] text-ink-faint" style={{ lineHeight: 1 }}>
                {p.positive ? '↑' : '↓'}
              </span>
            </button>
          ))}
          <span className="text-[10px] text-ink-faint caps ml-2" style={{ letterSpacing: '0.16em' }}>
            now
          </span>
        </div>
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

      {(() => {
        const ch = currentChapter(ageInYears(blueprint.birth.iso));
        if (!ch) return null;
        const pct = ((ageInYears(blueprint.birth.iso) - ch.startAge) / (ch.endAge - ch.startAge)) * 100;
        return (
          <section className="mt-6 border-l-2 pl-3" style={{ borderLeftColor: '#3a3a3a' }}>
            <p className="small-label caps text-ink-faint">
              chapter · <span className="text-ink">{ch.label.toLowerCase()}</span>
              <span className="ml-2 text-[10px]">ages {ch.startAge}–{ch.endAge} · {pct.toFixed(0)}% through</span>
            </p>
          </section>
        );
      })()}

      {currentStation && (
        <section className="mt-6 border border-accent/40 p-4" style={{ borderColor: '#3a1a1a' }}>
          <div className="flex items-baseline justify-between mb-1">
            <p className="small-label caps text-accent">life station · {currentStation.label.toLowerCase()}</p>
            <p className="small-label caps text-ink-faint">
              age {currentStation.age} · {currentStation.distance < 0.5 ? 'right on it' : `${currentStation.distance.toFixed(1)}y ${ageInYears(blueprint.birth.iso) > currentStation.age ? 'past' : 'ahead'}`}
            </p>
          </div>
          <p className="text-[12px] text-ink-faint caps mb-2" style={{ letterSpacing: '0.08em' }}>
            {currentStation.convergence}
          </p>
          <p className="serif text-[14px] text-ink-dim leading-relaxed">
            {currentStation.description}
          </p>
          <Link
            href={`/arcs?age=${currentStation.age}`}
            className="btn-ghost mt-2 inline-block"
          >
            see this station on your arcs →
          </Link>
        </section>
      )}

      <nav className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[10px] caps text-ink-faint border-t border-b border-hairline py-1.5" style={{ letterSpacing: '0.12em' }}>
        <a href="#stack" className="hover:text-ink">stack</a>
        <a href="#forecast" className="hover:text-ink">forecast</a>
        <a href="#flips" className="hover:text-ink">flips</a>
        <a href="#interpretation" className="hover:text-ink">interpretation</a>
        <a href="#timeline" className="hover:text-ink">timeline</a>
        <a href="#read" className="hover:text-ink">how to read</a>
        <a href="#cycles" className="hover:text-ink">each cycle</a>
        <a href="#returns" className="hover:text-ink">next returns</a>
        <a href="/year" className="hover:text-ink text-accent">/year →</a>
      </nav>

      <section id="stack" className="mt-6 scroll-mt-4">
        <PolarityBars positions={positions} flips={flips} birthIso={blueprint.birth.iso} />
        <ScrollHint label="tap a bar · or scroll" />
      </section>

      {blueprint.humanDesign?.authority && AUTHORITY_FOR_POLARITY[blueprint.humanDesign.authority] && (
        <section className="mt-8 border-l-2 pl-3" style={{ borderLeftColor: '#8b3a3a' }}>
          <p className="small-label caps text-accent">
            for {blueprint.humanDesign.type.toLowerCase()}s with {blueprint.humanDesign.authority.toLowerCase()} authority
          </p>
          <p className="serif text-[14px] text-ink-dim mt-1.5 leading-relaxed">
            {AUTHORITY_FOR_POLARITY[blueprint.humanDesign.authority]}
          </p>
        </section>
      )}

      <section id="forecast" className="mt-10 border-t border-hairline pt-6 scroll-mt-4">
        <div className="flex items-baseline justify-between mb-3">
          <p className="small-label caps">
            the next {forecastMonths >= 12 ? `${Math.round(forecastMonths / 12)} year${forecastMonths > 12 ? 's' : ''}` : `${forecastMonths} months`}
          </p>
          <div className="flex gap-2">
            {[6, 12, 24, 60].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setForecastMonths(m)}
                className={`small-label caps text-[10px] ${forecastMonths === m ? 'text-accent' : 'text-ink-faint hover:text-ink'}`}
              >
                {m < 12 ? `${m}m` : `${m / 12}y`}
              </button>
            ))}
          </div>
        </div>
        <PolarityForecast birthIso={blueprint.birth.iso} months={forecastMonths} />
        <p className="text-[12px] text-ink-dim serif italic mt-3 leading-relaxed">
          A glance at how the stack changes month by month. Bright cell =
          rising, faded cell = descending. The cycles that change colour
          most across the strip are the ones about to flip.
        </p>
      </section>

      {(recentFlips.length > 0 || imminentFlips.length > 0) && (
        <section id="flips" className="mt-10 border-t border-hairline pt-6 scroll-mt-4">
          <p className="small-label caps mb-3">flips inside the month</p>
          <div className="grid grid-cols-1 gap-2 text-[13px]">
            {recentFlips.map((f) => (
              <div
                key={`r-${f.cycle.key}`}
                className="flex justify-between border-l-2 pl-2"
                style={{ borderLeftColor: f.cycle.color }}
              >
                <span className="text-ink-dim">
                  <span className="serif text-[12px] text-ink-dim mr-1" aria-hidden>{f.cycle.glyph}</span>
                  <span className="text-ink">{f.cycle.label.toLowerCase()}</span>{' '}
                  flipped to <span className="text-ink">{f.positive ? 'rising' : 'descending'}</span>
                </span>
                <span className="tabular-nums text-ink-faint">
                  {Math.round(f.daysSinceStart)}d ago
                </span>
              </div>
            ))}
            {imminentFlips.map((f) => (
              <div
                key={`i-${f.cycle.key}`}
                className="flex justify-between border-l-2 pl-2 opacity-90"
                style={{ borderLeftColor: f.cycle.color }}
              >
                <span className="text-ink-dim">
                  <span className="serif text-[12px] text-ink-dim mr-1" aria-hidden>{f.cycle.glyph}</span>
                  <span className="text-ink">{f.cycle.label.toLowerCase()}</span>{' '}
                  flips to <span className="text-ink">{f.positive ? 'descending' : 'rising'}</span>
                </span>
                <span className="tabular-nums text-accent">
                  in {Math.round(f.daysUntilEnd)}d
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section id="timeline" className="mt-10 border-t border-hairline pt-6 scroll-mt-4">
        <div className="flex items-baseline justify-between mb-3">
          <p className="small-label caps">what's coming</p>
          <div className="flex gap-2">
            {(['1y', '5y', '20y'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setTimelineRange(r)}
                className={`small-label caps text-[10px] ${timelineRange === r ? 'text-accent' : 'text-ink-faint hover:text-ink'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        {upcomingEvents.length === 0 ? (
          <p className="text-ink-dim text-[13px] italic">no major events inside this window.</p>
        ) : (
          <ol className="space-y-2 text-[13px]">
            {upcomingEvents.map((e, i) => {
              const dStr = e.daysAhead < 365
                ? `${Math.round(e.daysAhead)}d`
                : `${(e.daysAhead / 365.25).toFixed(1)}y`;
              const dateStr = e.date.toLocaleDateString(undefined, {
                year: e.daysAhead > 365 ? 'numeric' : undefined,
                month: 'short',
                day: 'numeric',
              });
              return (
                <li
                  key={i}
                  className="flex items-baseline justify-between border-l-2 pl-2 py-1"
                  style={{ borderLeftColor: e.color, opacity: e.kind === 'flip' ? 0.85 : 1 }}
                >
                  <span className="text-ink-dim flex items-baseline gap-2 min-w-0">
                    {e.cycle && (
                      <span className="serif text-[12px] text-ink-dim" aria-hidden>{e.cycle.glyph}</span>
                    )}
                    {e.kind === 'station' && (
                      <span className="text-accent serif text-[10px]" aria-hidden>◆</span>
                    )}
                    <span className="text-ink truncate">{e.title}</span>
                    <span className="text-ink-faint text-[11px] truncate">{e.detail}</span>
                  </span>
                  <span className="text-right shrink-0 tabular-nums text-[11px]">
                    <span className="text-ink-faint">{dateStr}</span>
                    <span className="text-ink-dim ml-2">in {dStr}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Deterministic 'polarity at a glance' — always works, copy-friendly */}
      <section className="mt-10 border-t border-hairline pt-6">
        <div className="flex items-baseline justify-between mb-2">
          <p className="small-label caps">polarity at a glance</p>
          <button
            type="button"
            className="small-label caps text-[10px] text-ink-faint hover:text-ink"
            onClick={async () => {
              const txt = polarityGlanceText(blueprint);
              try {
                if (navigator.share) await navigator.share({ title: 'Polarity', text: txt });
                else {
                  await navigator.clipboard.writeText(txt);
                  const el = document.getElementById('polarity-glance-toast');
                  if (el) { el.style.opacity = '1'; window.setTimeout(() => { el.style.opacity = '0'; }, 1500); }
                }
              } catch {/* cancelled */}
            }}
          >
            share
          </button>
        </div>
        <pre className="text-[12.5px] text-ink-dim font-mono whitespace-pre-wrap leading-relaxed">
{polarityGlanceText(blueprint)}
        </pre>
        <div id="polarity-glance-toast" className="small-label caps text-accent text-right" style={{ opacity: 0, transition: 'opacity 300ms ease', height: '1em' }}>copied</div>
      </section>

      <section id="interpretation" className="mt-10 border-t border-hairline pt-6 scroll-mt-4">
        <p className="small-label caps text-ink-faint mb-2">what this all means · a written reading</p>
        {loading && !polarity?.paragraph && (
          <p className="text-ink-dim italic">reading the stack…</p>
        )}
        {error && (
          <div>
            <p className="text-accent text-[13px]">{error}</p>
            <button className="btn-ghost mt-2" onClick={() => { hapticTap('light'); void fetchPolarity(); }}>try again</button>
          </div>
        )}
        {polarity?.paragraph && (
          <p className="body-prose serif text-ink">{polarity.paragraph}</p>
        )}
      </section>

      {/* Always-visible key explaining the bars */}
      <section id="read" className="mt-12 border-t border-hairline pt-6 scroll-mt-4">
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
      <section id="cycles" className="mt-12 space-y-10 scroll-mt-4">
        <h2 className="h-display serif" style={{ fontSize: '1.4rem' }}>
          Each cycle, in depth.
        </h2>
        {CYCLES.map((c) => {
          const lens = POLARITY_LENSES[c.key];
          if (!lens) return null;
          const pos = positions.find((p) => p.cycle.key === c.key);
          const flip = flips.find((f) => f.cycle.key === c.key);
          // Match each cycle to its natal anchor for a personalising note.
          const n = blueprint.natal;
          const natalAnchor: { label: string; sign: string; degree: number } | null = (() => {
            switch (c.key) {
              case 'solar':   return { label: 'your natal Sun',     sign: n.sun.sign,     degree: n.sun.degree };
              case 'mars':    return { label: 'your natal Mars',    sign: n.mars.sign,    degree: n.mars.degree };
              case 'jupiter': return { label: 'your natal Jupiter', sign: n.jupiter.sign, degree: n.jupiter.degree };
              case 'saturn':  return { label: 'your natal Saturn',  sign: n.saturn.sign,  degree: n.saturn.degree };
              case 'nodal':   return { label: 'your North Node',    sign: n.northNode.sign, degree: n.northNode.degree };
              case 'chiron':  return n.chiron ? { label: 'your natal Chiron', sign: n.chiron.sign, degree: n.chiron.degree } : null;
              case 'lunarPg': return { label: 'your natal Moon',    sign: n.moon.sign,    degree: n.moon.degree };
              default: return null;
            }
          })();
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
              {natalAnchor && (
                <p className="small-label caps text-ink-faint mb-2" style={{ letterSpacing: '0.08em' }}>
                  {natalAnchor.label} · <span className="text-ink">{natalAnchor.sign} {natalAnchor.degree.toFixed(0)}°</span>
                </p>
              )}
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
        <section id="returns" className="mt-12 border-t border-hairline pt-6 scroll-mt-4">
          <p className="small-label caps mb-3">next returns</p>
          <ul className="space-y-1">
            {upcoming.map((u) => (
              <li key={u.cycle.key} className="flex justify-between text-[13px] border-b border-hairline py-1">
                <span className="text-ink-dim">
                  <span className="serif text-[12px] text-ink-dim mr-1.5" aria-hidden>{u.cycle.glyph}</span>
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
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            <button
              className="btn-ghost"
              onClick={() => downloadCalendar(blueprint, ['returns'], 'returns')}
            >
              download returns (.ics)
            </button>
            <button
              className="btn-ghost"
              onClick={() => downloadCalendar(blueprint, ['flips'], 'flips')}
            >
              download flips (.ics)
            </button>
            <button
              className="btn-ghost"
              onClick={() => downloadCalendar(blueprint, ['returns', 'flips'], 'cycles')}
            >
              download all (.ics)
            </button>
          </div>
        </section>
      )}

      <section className="mt-6">
        <button className="btn-ghost" onClick={() => { hapticTap('light'); void fetchPolarity(); }} disabled={loading}>
          {loading ? 'refreshing…' : 'refresh interpretation'}
        </button>
      </section>
    </main>
    </PullToRefresh>
  );
}

async function downloadCalendar(blueprint: NonNullable<ReturnType<typeof useStore.getState>['blueprint']>, include: string[], baseName: string) {
  try {
    const res = await fetch(api('/api/calendar'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ blueprint, include }),
    });
    if (!res.ok) {
      console.error('calendar download failed', res.status);
      alert("Calendar export didn't go through. Try again in a moment.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `liraydhas-${baseName}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('calendar download error', e);
    alert("Calendar export didn't go through. Check your connection and try again.");
  }
}
