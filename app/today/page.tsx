'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import SkyVisual from '@/components/SkyVisual';
import type { DailyReport } from '@/lib/types';

const PRETTY_ASPECT: Record<string, string> = {
  conjunction: 'conjoins', sextile: 'sextiles', square: 'squares',
  trine: 'trines', opposition: 'opposes',
};

export default function TodayPage() {
  const router = useRouter();
  const blueprint = useStore((s) => s.blueprint);
  const daily = useStore((s) => s.daily);
  const setDaily = useStore((s) => s.setDaily);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!blueprint) router.replace('/onboarding');
    }, 60);
    return () => clearTimeout(t);
  }, [blueprint, router]);

  useEffect(() => {
    if (!blueprint) return;
    const today = new Date().toISOString().slice(0, 10);
    if (daily && daily.date === today) return; // already fresh
    void fetchDaily();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blueprint]);

  async function fetchDaily() {
    if (!blueprint) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/daily', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ blueprint }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `error ${res.status}`);
      }
      const data = (await res.json()) as DailyReport;
      setDaily(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'failed');
    } finally {
      setLoading(false);
    }
  }

  if (!blueprint) return null;

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <main className="page max-w-md mx-auto fade-in">
      <header className="pb-6">
        <p className="small-label caps">{today}</p>
      </header>

      {loading && !daily && (
        <p className="text-ink-dim italic">reading the sky…</p>
      )}
      {error && (
        <div className="border border-hairline p-4 mb-4">
          <p className="text-accent text-[13px]">{error}</p>
          <button className="btn-ghost mt-3" onClick={fetchDaily}>retry</button>
        </div>
      )}

      {daily?.paragraph && (
        <p className="body-prose serif text-ink">
          {daily.paragraph}
        </p>
      )}

      {daily?.transits && daily.transits.length > 0 && (
        <section className="mt-10">
          <p className="small-label caps mb-3">transits today</p>
          <ul className="space-y-2">
            {daily.transits.map((t, i) => (
              <li key={i} className="flex justify-between text-[13px] text-ink-dim border-b border-hairline pb-2">
                <span>
                  <span className="text-ink">{t.transitPlanet}</span>{' '}
                  {PRETTY_ASPECT[t.aspect]}{' '}
                  natal <span className="text-ink">{t.natalPlanet}</span>
                </span>
                <span className="tabular-nums">{t.orb.toFixed(1)}°</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-12">
        <p className="small-label caps mb-2">current sky</p>
        <SkyVisual blueprint={blueprint} />
      </section>

      <section className="mt-10">
        <button className="btn-ghost" onClick={fetchDaily} disabled={loading}>
          {loading ? 'refreshing…' : 'refresh report'}
        </button>
      </section>
    </main>
  );
}
