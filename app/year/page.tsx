'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import PolarityForecast from '@/components/PolarityForecast';
import { ageInYears } from '@/lib/cycles';
import { upcomingEventsFeed } from '@/lib/upcomingEvents';
import { currentChapter } from '@/lib/lifeChapters';
import { yearGlanceText } from '@/lib/yearGlance';
import { api } from '@/lib/apiBase';
import { readSseStream, isEventStream } from '@/lib/streamRead';
import { useAbortableAction, isAbortError } from '@/lib/useAbortableAction';
import PullToRefresh from '@/components/PullToRefresh';
import { friendlyError } from '@/lib/friendlyError';
import { tap as hapticTap } from '@/lib/haptics';
import { useSubState, isPro } from '@/lib/subscription';
import ProGate from '@/components/ProGate';
import type { YearReading } from '@/lib/types';

export default function YearPage() {
  const router = useRouter();
  const blueprint = useStore((s) => s.blueprint);
  const year = useStore((s) => s.year);
  const setYear = useStore((s) => s.setYear);
  const sub = useSubState();
  const pro = isPro(sub);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamParagraph, setStreamParagraph] = useState('');
  const startYearFetch = useAbortableAction();

  useEffect(() => {
    const t = setTimeout(() => { if (!blueprint) router.replace('/onboarding'); }, 60);
    return () => clearTimeout(t);
  }, [blueprint, router]);

  async function fetchYear() {
    if (!blueprint) return;
    const startBlueprint = blueprint;
    const { signal, stale } = startYearFetch();
    setLoading(true);
    setError(null);
    setStreamParagraph('');
    try {
      const res = await fetch(api('/api/year?stream=1'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ blueprint: startBlueprint }),
        signal,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `error ${res.status}`);
      }
      if (!isEventStream(res)) {
        const data = (await res.json()) as YearReading;
        if (stale() || useStore.getState().blueprint !== startBlueprint) return;
        setYear(data);
        return;
      }
      let generatedAt = new Date().toISOString();
      let softError: string | null = null;
      await readSseStream(res, {
        meta: (m) => {
          if (typeof m.generatedAt === 'string') generatedAt = m.generatedAt;
        },
        paragraph: (_d, full) => { if (!stale()) setStreamParagraph(full); },
        done: ({ paragraph }) => {
          if (stale() || useStore.getState().blueprint !== startBlueprint) return;
          setYear({ paragraph, generatedAt });
          setStreamParagraph('');
        },
        error: (msg) => { softError = msg; },
      }, signal);
      if (!stale() && softError) {
        setStreamParagraph('');
        setError(friendlyError(softError));
      }
    } catch (e: unknown) {
      if (isAbortError(e) || stale()) return;
      setError(friendlyError(e instanceof Error ? e.message : null));
    } finally {
      if (!stale()) setLoading(false);
    }
  }

  useEffect(() => {
    if (!blueprint || year) return;
    // Don't auto-burn an LLM call for a non-Pro user — they'll see the
    // paywall instead. When they subscribe, the effect re-runs and
    // fetches.
    if (!pro) return;
    void fetchYear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blueprint, year, pro]);

  const events = useMemo(() => {
    if (!blueprint) return [];
    return upcomingEventsFeed(blueprint.birth.iso, new Date(), { horizonYears: 1 });
  }, [blueprint]);

  // Pick the 3 most significant events for the year — prioritise stations,
  // then slow-cycle returns (Chiron > Saturn > Nodal > Jupiter > Mars), then
  // anything else.
  const headlines = useMemo(() => {
    const rank = (k: string) => {
      if (k === 'station') return 0;
      if (k === 'return') return 1;
      return 2;
    };
    const cycleWeight: Record<string, number> = {
      chiron: 0, saturn: 1, nodal: 2, jupiter: 3, mars: 4, solar: 5, lunarPg: 6,
    };
    const scored = events.slice();
    scored.sort((a, b) => {
      const r = rank(a.kind) - rank(b.kind);
      if (r !== 0) return r;
      const aw = a.cycle ? (cycleWeight[a.cycle.key] ?? 9) : 9;
      const bw = b.cycle ? (cycleWeight[b.cycle.key] ?? 9) : 9;
      return aw - bw;
    });
    // Dedupe by title+detail
    const seen = new Set<string>();
    const out: typeof events = [];
    for (const e of scored) {
      const key = `${e.title}|${e.detail}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(e);
      if (out.length >= 3) break;
    }
    return out;
  }, [events]);

  // Group events by month-year
  const byMonth = useMemo(() => {
    const m: Record<string, typeof events> = {};
    for (const e of events) {
      const key = `${e.date.getFullYear()}-${e.date.getMonth()}`;
      if (!m[key]) m[key] = [];
      m[key].push(e);
    }
    return m;
  }, [events]);

  if (!blueprint) return null;

  const age = ageInYears(blueprint.birth.iso);
  const ch = currentChapter(age);
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return { date: d, key: `${d.getFullYear()}-${d.getMonth()}` };
  });

  return (
    <PullToRefresh
      onRefresh={async () => {
        // Re-fetch the LLM paragraph if Pro; otherwise no-op (free
        // users would just see the paywall again).
        if (pro) {
          setYear(null);
          await fetchYear();
        }
      }}
    >
    <main className="page max-w-3xl mx-auto fade-in">
      <header className="pb-6">
        <p className="small-label caps">Year ahead</p>
        <h1 className="h-display serif mt-3">Twelve months, drawn out.</h1>
        {ch && (
          <p className="small-label caps text-ink-faint mt-3">
            you are in · <span className="text-ink">{ch.label.toLowerCase()}</span>
            <span className="ml-2 text-[10px]">ages {ch.startAge}–{ch.endAge}</span>
          </p>
        )}
      </header>

      <section className="mt-6 min-h-[120px]">
        <ProGate
          feature="A year-ahead reading that pulls together your upcoming stations, returns, and polarity flips into one paragraph."
        >
          {loading && !year && !streamParagraph && (
            <div>
              <p
                className="small-label caps text-ink-faint mb-3"
                style={{ letterSpacing: '0.18em' }}
              >
                composing your year reading
              </p>
              <div className="space-y-2 animate-pulse">
                <div className="h-4 bg-hairline w-11/12" />
                <div className="h-4 bg-hairline w-10/12" />
                <div className="h-4 bg-hairline w-9/12" />
                <div className="h-4 bg-hairline w-8/12" />
              </div>
            </div>
          )}
          {error && (
            <div className="border border-hairline p-3">
              <p className="text-accent text-[13px]">{error}</p>
              <button
                className="btn-ghost mt-2"
                onClick={() => { hapticTap('light'); void fetchYear(); }}
              >
                try again
              </button>
            </div>
          )}
          {(year?.paragraph || streamParagraph) && (
            <p className="body-prose serif text-ink">
              {year?.paragraph || streamParagraph}
              {streamParagraph && !year?.paragraph && (
                <span className="stream-cursor" aria-hidden>▎</span>
              )}
            </p>
          )}
          {year?.paragraph && (
            <button
              type="button"
              onClick={() => { hapticTap('light'); setYear(null); void fetchYear(); }}
              className="small-label caps text-ink-faint hover:text-ink mt-3 text-[10px]"
              style={{ letterSpacing: '0.16em' }}
            >
              refresh reading
            </button>
          )}
        </ProGate>
      </section>

      {headlines.length > 0 && (
        <section className="mt-6">
          <p className="small-label caps mb-3">headlines</p>
          <ul className="space-y-2">
            {headlines.map((e, i) => (
              <li
                key={i}
                className="border-l-2 pl-3 py-1"
                style={{ borderLeftColor: e.color }}
              >
                <p className="serif text-[15px] text-ink">
                  {e.cycle && <span className="text-ink-dim serif text-[13px] mr-1.5" aria-hidden>{e.cycle.glyph}</span>}
                  {e.kind === 'station' && <span className="text-accent text-[10px] mr-1.5">◆</span>}
                  {e.title}
                </p>
                <p className="text-[11px] text-ink-faint caps mt-0.5" style={{ letterSpacing: '0.08em' }}>
                  {e.detail} · {e.date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })} · in {e.daysAhead < 365 ? `${Math.round(e.daysAhead)}d` : `${(e.daysAhead / 365.25).toFixed(1)}y`}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <p className="small-label caps mb-2">polarity heatmap · 12 months</p>
        <PolarityForecast birthIso={blueprint.birth.iso} months={12} anchorPrefix="ym-" />
        <p
          className="small-label caps text-ink-faint mt-1 text-center text-[10px]"
          style={{ letterSpacing: '0.14em' }}
        >
          tap a column to jump to that month
        </p>
      </section>

      <section className="mt-10">
        <p className="small-label caps mb-3">events by month</p>
        <ul className="space-y-5">
          {months.map((m) => {
            const monthEvents = byMonth[m.key] ?? [];
            return (
              <li
                key={m.key}
                id={`ym-${m.key}`}
                className="border-l border-hairline pl-3 month-target"
                style={{ scrollMarginTop: '5rem' }}
              >
                <p className="serif text-[16px] text-ink">
                  {m.date.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
                </p>
                {monthEvents.length === 0 ? (
                  <p className="text-[12px] text-ink-faint italic mt-1">no major events</p>
                ) : (
                  <ul className="mt-1.5 space-y-1">
                    {monthEvents.map((e, i) => (
                      <li
                        key={i}
                        className="flex items-baseline justify-between text-[12.5px] border-l pl-2 py-0.5"
                        style={{ borderLeftColor: e.color }}
                      >
                        <span className="text-ink-dim">
                          {e.cycle && <span className="serif text-[12px] text-ink-dim mr-1.5" aria-hidden>{e.cycle.glyph}</span>}
                          {e.kind === 'station' && <span className="text-accent text-[10px] mr-1">◆</span>}
                          <span className="text-ink">{e.title}</span>
                          <span className="text-ink-faint text-[11px] ml-1.5">{e.detail}</span>
                        </span>
                        <span className="tabular-nums text-ink-faint">
                          {e.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-12 border-t border-hairline pt-6">
        <div className="flex items-baseline justify-between mb-2">
          <p className="small-label caps">year at a glance</p>
          <button
            type="button"
            className="small-label caps text-[10px] text-ink-faint hover:text-ink"
            onClick={async () => {
              const txt = yearGlanceText(blueprint);
              try {
                if (navigator.share) await navigator.share({ title: 'Year ahead', text: txt });
                else {
                  await navigator.clipboard.writeText(txt);
                  const el = document.getElementById('year-glance-toast');
                  if (el) { el.style.opacity = '1'; window.setTimeout(() => { el.style.opacity = '0'; }, 1500); }
                }
              } catch {/* cancelled */}
            }}
          >
            share
          </button>
        </div>
        <pre className="text-[12.5px] text-ink-dim font-mono whitespace-pre-wrap leading-relaxed">
{yearGlanceText(blueprint)}
        </pre>
        <div id="year-glance-toast" className="small-label caps text-accent text-right" style={{ opacity: 0, transition: 'opacity 300ms ease', height: '1em' }}>copied</div>
      </section>

      <section className="mt-10 space-y-2">
        <Link href="/polarity" className="btn-ghost block">see the live polarity stack →</Link>
        <Link href="/arcs" className="btn-ghost block">see the full lifetime arcs →</Link>
      </section>
    </main>
    </PullToRefresh>
  );
}
