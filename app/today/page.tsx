'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import SkyVisual from '@/components/SkyVisual';
import MoonIcon from '@/components/MoonIcon';
import { currentMoon } from '@/lib/astrology/moon';
import { daysUntilSolarReturn } from '@/lib/astrology/returns';
import { userTransits, type UserTransits } from '@/lib/humandesign/transitGates';
import type { DailyReport } from '@/lib/types';

const PRETTY_ASPECT: Record<string, string> = {
  conjunction: 'conjoins', sextile: 'sextiles', square: 'squares',
  trine: 'trines', opposition: 'opposes',
};

export default function TodayPage() {
  const router = useRouter();
  const blueprint = useStore((s) => s.blueprint);
  const daily = useStore((s) => s.daily);
  const history = useStore((s) => s.history);
  const setDaily = useStore((s) => s.setDaily);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moon, setMoon] = useState<ReturnType<typeof currentMoon> | null>(null);
  const [solarReturnDays, setSolarReturnDays] = useState<number | null>(null);
  const [todayHd, setTodayHd] = useState<UserTransits | null>(null);

  useEffect(() => {
    setMoon(currentMoon());
  }, []);

  useEffect(() => {
    if (!blueprint) return;
    setTodayHd(userTransits(blueprint));
  }, [blueprint]);

  useEffect(() => {
    if (!blueprint) return;
    setSolarReturnDays(daysUntilSolarReturn(blueprint.natal.sun.longitude));
  }, [blueprint]);

  useEffect(() => {
    const t = setTimeout(() => { if (!blueprint) router.replace('/onboarding'); }, 60);
    return () => clearTimeout(t);
  }, [blueprint, router]);

  useEffect(() => {
    if (!blueprint) return;
    const today = new Date().toISOString().slice(0, 10);
    if (daily && daily.date === today) return;
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

  const hd = blueprint.humanDesign;
  const n = blueprint.natal;

  const pastDays = history.filter((h) => h.date !== daily?.date).slice(0, 6);

  return (
    <main className="page max-w-md mx-auto fade-in">
      <header className="pb-8 flex items-baseline justify-between gap-3">
        <p className="small-label caps">{today}</p>
        {moon && (
          <span className="flex items-center gap-1.5 small-label caps">
            <MoonIcon phase={moon.phaseDegrees} size={16} />
            <span>{moon.name.toLowerCase()} · {moon.moonSign}</span>
          </span>
        )}
      </header>

      <section className="min-h-[200px]">
        {loading && !daily && <DailyParagraphSkeleton />}
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
      </section>

      {daily?.transits && daily.transits.length > 0 && (
        <section className="mt-12">
          <p className="small-label caps mb-3">today's transits</p>
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

      {todayHd && (
        <section className="mt-12">
          <p className="small-label caps mb-3">today, on your chart</p>
          {todayHd.lit.length === 0 && todayHd.completes.length === 0 && (
            <p className="text-ink-dim italic text-[13px]">
              No transit gates touching your natal design today.
            </p>
          )}
          {todayHd.lit.length > 0 && (
            <div className="mb-3">
              <p className="small-label caps text-ink-faint mb-1">
                your natal gates lit today
              </p>
              <ul className="space-y-1">
                {todayHd.lit.map((l, i) => (
                  <li key={i} className="flex justify-between text-[13px] border-b border-hairline py-1">
                    <span className="text-ink-dim">
                      transiting <span className="text-ink">{l.planet}</span> in
                    </span>
                    <span className="tabular-nums text-ink">
                      gate {l.gate}.{l.line}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {todayHd.completes.length > 0 && (
            <div className="mt-4">
              <p className="small-label caps text-ink-faint mb-1">
                channels temporarily complete
              </p>
              <ul className="space-y-1">
                {todayHd.completes.map((c, i) => (
                  <li key={i} className="flex justify-between text-[13px] border-b border-hairline py-1">
                    <span className="text-ink-dim">
                      <span className="text-ink">{c.transitPlanet}</span> in {c.transitGate} ↔ your {c.natalGate}
                    </span>
                    <span className="text-ink-faint italic">{c.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="mt-14">
        <p className="small-label caps mb-2">current sky</p>
        <SkyVisual blueprint={blueprint} />
      </section>

      {pastDays.length > 0 && (
        <section className="mt-14">
          <p className="small-label caps mb-3">the past week</p>
          <ul className="space-y-4">
            {pastDays.map((h) => (
              <li key={h.date} className="border-b border-hairline pb-3">
                <p className="small-label caps text-ink-faint mb-1">
                  {new Date(h.date + 'T00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
                <p className="text-[13.5px] text-ink-dim line-clamp-3 serif">{h.paragraph}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-14 border-t border-hairline pt-6">
        <p className="small-label caps mb-3">you</p>
        <ul className="grid grid-cols-2 gap-y-1 text-[13px]">
          <Mini k="Sun" v={`${n.sun.sign} ${n.sun.degree.toFixed(0)}°`} />
          <Mini k="Moon" v={n.moon.sign} />
          {n.asc !== null && <Mini k="Rising" v={signFromLon(n.asc)} />}
          <Mini k="Type" v={hd.type} />
          <Mini k="Profile" v={hd.profile} />
          <Mini k="Authority" v={hd.authority} />
        </ul>
        {solarReturnDays !== null && (
          <p className="small-label caps mt-4 text-ink-faint">
            solar return in {Math.round(solarReturnDays)} days
          </p>
        )}
      </section>

      <section className="mt-8 mb-2">
        <button className="btn-ghost" onClick={fetchDaily} disabled={loading}>
          {loading ? 'refreshing…' : 'refresh report'}
        </button>
      </section>
    </main>
  );
}

function DailyParagraphSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-5 bg-hairline w-11/12" />
      <div className="h-5 bg-hairline w-full" />
      <div className="h-5 bg-hairline w-10/12" />
      <div className="h-5 bg-hairline w-9/12" />
      <div className="h-5 bg-hairline w-8/12" />
    </div>
  );
}

function Mini({ k, v }: { k: string; v: string }) {
  return (
    <li className="flex justify-between border-b border-hairline py-1">
      <span className="text-ink-dim">{k}</span>
      <span className="text-ink">{v}</span>
    </li>
  );
}

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];
function signFromLon(lon: number): string {
  const n = ((lon % 360) + 360) % 360;
  return SIGNS[Math.floor(n / 30)];
}
