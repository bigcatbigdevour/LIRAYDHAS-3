'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import PolarityForecast from '@/components/PolarityForecast';
import { ageInYears } from '@/lib/cycles';
import { upcomingEventsFeed } from '@/lib/upcomingEvents';
import { currentChapter } from '@/lib/lifeChapters';

export default function YearPage() {
  const router = useRouter();
  const blueprint = useStore((s) => s.blueprint);

  useEffect(() => {
    const t = setTimeout(() => { if (!blueprint) router.replace('/onboarding'); }, 60);
    return () => clearTimeout(t);
  }, [blueprint, router]);

  const events = useMemo(() => {
    if (!blueprint) return [];
    return upcomingEventsFeed(blueprint.birth.iso, new Date(), { horizonYears: 1 });
  }, [blueprint]);

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
    <main className="page max-w-3xl mx-auto fade-in">
      <header className="pb-6">
        <p className="small-label caps">Year ahead</p>
        <h1 className="h-display serif mt-3">Twelve months, drawn out.</h1>
        <p className="serif text-[14.5px] text-ink-dim mt-3 leading-relaxed">
          Every cycle flip, every return, every named life-station inside
          the next year — laid out chronologically. The heatmap shows the
          rising/descending shape across the whole stack.
        </p>
        {ch && (
          <p className="small-label caps text-ink-faint mt-3">
            you are in · <span className="text-ink">{ch.label.toLowerCase()}</span>
            <span className="ml-2 text-[10px]">ages {ch.startAge}–{ch.endAge}</span>
          </p>
        )}
      </header>

      <section className="mt-6">
        <p className="small-label caps mb-2">polarity heatmap · 12 months</p>
        <PolarityForecast birthIso={blueprint.birth.iso} months={12} />
      </section>

      <section className="mt-10">
        <p className="small-label caps mb-3">events by month</p>
        <ul className="space-y-5">
          {months.map((m) => {
            const monthEvents = byMonth[m.key] ?? [];
            return (
              <li key={m.key} className="border-l border-hairline pl-3">
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

      <section className="mt-10 space-y-2">
        <Link href="/polarity" className="btn-ghost block">see the live polarity stack →</Link>
        <Link href="/arcs" className="btn-ghost block">see the full lifetime arcs →</Link>
      </section>
    </main>
  );
}
