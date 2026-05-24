'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import SkyVisual from '@/components/SkyVisual';
import MoonIcon from '@/components/MoonIcon';
import { currentMoon, nextLunation, type UpcomingLunation } from '@/lib/astrology/moon';
import { daysUntilSolarReturn } from '@/lib/astrology/returns';
import { upcomingForecast, currentRetrogrades, type UpcomingAspect } from '@/lib/astrology/transits';
import type { PlanetName } from '@/lib/types';
import { userTransits, type UserTransits } from '@/lib/humandesign/transitGates';
import { channelMeaning } from '@/lib/humandesign/channelMeanings';
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
  const [lunation, setLunation] = useState<UpcomingLunation | null>(null);
  const [solarReturnDays, setSolarReturnDays] = useState<number | null>(null);
  const [todayHd, setTodayHd] = useState<UserTransits | null>(null);
  const [forecast, setForecast] = useState<UpcomingAspect[] | null>(null);
  const [retrogrades, setRetrogrades] = useState<PlanetName[]>([]);
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);

  useEffect(() => {
    setMoon(currentMoon());
    setLunation(nextLunation());
    setRetrogrades(currentRetrogrades());
  }, []);

  useEffect(() => {
    if (!blueprint) return;
    setTodayHd(userTransits(blueprint));
    setForecast(upcomingForecast(blueprint.natal, 7));
  }, [blueprint]);

  useEffect(() => {
    if (!blueprint) return;
    setSolarReturnDays(daysUntilSolarReturn(blueprint.natal.sun.longitude));
  }, [blueprint]);

  const isSolarReturnToday =
    solarReturnDays !== null && (solarReturnDays < 1 || solarReturnDays > 364.5);

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
      <header className="pb-8">
        <div className="flex items-baseline justify-between gap-3">
          <p className="small-label caps">{today}</p>
          {moon && (
            <span className="flex items-center gap-1.5 small-label caps">
              <MoonIcon phase={moon.phaseDegrees} size={16} />
              <span>{moon.name.toLowerCase()} · {moon.moonSign}</span>
            </span>
          )}
        </div>
        {isSolarReturnToday && (
          <p className="text-accent text-[11px] mt-2 caps" style={{ letterSpacing: '0.2em' }}>
            ✦ solar return — your year begins
          </p>
        )}
        {!isSolarReturnToday && lunation && lunation.daysUntil < 8 && (
          <p className="small-label caps text-ink-faint mt-2">
            {lunation.phase} moon in {Math.max(1, Math.round(lunation.daysUntil))} day{Math.round(lunation.daysUntil) === 1 ? '' : 's'}
          </p>
        )}
        {retrogrades.length > 0 && (
          <p className="small-label caps text-ink-faint mt-2">
            ℞ {retrogrades.join(' · ')}
          </p>
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
              <ul className="space-y-0">
                {todayHd.completes.map((c, i) => {
                  const key = `${c.channel[0]}-${c.channel[1]}-${i}`;
                  const isExpanded = expandedChannel === key;
                  const meaning = channelMeaning(c.name, c.channel[0], c.channel[1]);
                  return (
                    <li key={key} className="border-b border-hairline py-1.5">
                      <button
                        className="w-full flex justify-between text-[13px] text-left"
                        onClick={() => setExpandedChannel(isExpanded ? null : key)}
                      >
                        <span className="text-ink-dim">
                          <span className="text-ink">{c.transitPlanet}</span> in {c.transitGate} ↔ your {c.natalGate}
                        </span>
                        <span className="text-ink-faint italic">
                          {c.name} {meaning ? (isExpanded ? '−' : '+') : ''}
                        </span>
                      </button>
                      {isExpanded && meaning && (
                        <p className="text-[12.5px] text-ink-dim mt-1 serif italic">
                          {meaning}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="mt-14">
        <p className="small-label caps mb-2">current sky</p>
        <SkyVisual blueprint={blueprint} />
      </section>

      {forecast && forecast.length > 0 && (
        <section className="mt-14">
          <p className="small-label caps mb-3">the week ahead</p>
          <ul className="space-y-1">
            {forecast.map((f, i) => (
              <li key={i} className="flex justify-between items-baseline text-[13px] border-b border-hairline py-1.5">
                <span className="text-ink-dim">
                  <span className="text-ink">{f.aspect.transitPlanet}</span>{' '}
                  {PRETTY_ASPECT[f.aspect.aspect]}{' '}
                  natal <span className="text-ink">{f.aspect.natalPlanet}</span>
                </span>
                <span className="tabular-nums text-ink-faint text-[11px]">
                  {f.daysAhead === 0 ? 'today' : `in ${f.daysAhead}d`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

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

      <section className="mt-8 mb-2 flex items-center justify-between">
        <button className="btn-ghost" onClick={fetchDaily} disabled={loading}>
          {loading ? 'refreshing…' : 'refresh report'}
        </button>
        <a href="/about" className="btn-ghost">about →</a>
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
