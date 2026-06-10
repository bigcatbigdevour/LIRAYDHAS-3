'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import SkyVisual from '@/components/SkyVisual';
import MoonIcon from '@/components/MoonIcon';
import { currentMoon, nextLunation, hoursUntilMoonSignChange, type UpcomingLunation } from '@/lib/astrology/moon';
import { daysUntilSolarReturn } from '@/lib/astrology/returns';
import { todaysTransits, pickTopAspects, upcomingForecast, currentRetrogrades, type UpcomingAspect } from '@/lib/astrology/transits';
import type { TransitAspect } from '@/lib/types';
import { dailyVibe } from '@/lib/astrology/vibe';
import { ageInYears, polarityFlips, positionInCycles, type PolarityFlip } from '@/lib/cycles';
import { upcomingEventsFeed, type UpcomingEvent } from '@/lib/upcomingEvents';
import { todayGlanceText } from '@/lib/todayGlance';
import { imminentReturns, type KeyMoment } from '@/lib/keyMoments';
import { currentChapter } from '@/lib/lifeChapters';
import type { PlanetName } from '@/lib/types';
// (TransitAspect imported above with transits)
import { userTransits, type UserTransits } from '@/lib/humandesign/transitGates';
import { channelMeaning } from '@/lib/humandesign/channelMeanings';
import { aspectMeaning } from '@/lib/astrology/aspectMeanings';
import { readingStreak } from '@/lib/streak';
import PullToRefresh from '@/components/PullToRefresh';
import FirstTimeIntro from '@/components/FirstTimeIntro';
import { friendlyError } from '@/lib/friendlyError';
import { tap as hapticTap } from '@/lib/haptics';
import SaveDayButton from '@/components/SaveDayButton';
import { bestAnniversary } from '@/lib/savedDays';
import { questionForDate, questionLabelForHour } from '@/lib/dailyQuestion';
import { localDateStr, useToday } from '@/lib/localDate';
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
  // Reactive "today" — when a user leaves /today open across midnight, this
  // hook triggers a re-render so the daily-fetch effect, the question, the
  // save-button's dateIso, and the anniversary all use the new day.
  const todayIso = useToday();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moon, setMoon] = useState<ReturnType<typeof currentMoon> | null>(null);
  const [moonShift, setMoonShift] = useState<{ hours: number; nextSign: string } | null>(null);
  const [lunation, setLunation] = useState<UpcomingLunation | null>(null);
  const [solarReturnDays, setSolarReturnDays] = useState<number | null>(null);
  // The "this day a year ago" callout. Computed in an effect so SSR
  // doesn't try to read localStorage. null = "no anniversary entry exists".
  const [anniversary, setAnniversary] = useState<ReturnType<typeof bestAnniversary> | null>(null);
  // "Your first reading" ceremonial banner. True only on the very first
  // /today visit after onboarding (flag set by the onboarding page).
  // Self-clears after acknowledgement so future visits are uneventful.
  const [showWelcome, setShowWelcome] = useState(false);
  const [todayHd, setTodayHd] = useState<UserTransits | null>(null);
  const [forecast, setForecast] = useState<UpcomingAspect[] | null>(null);
  const [retrogrades, setRetrogrades] = useState<PlanetName[]>([]);
  const [liveTransits, setLiveTransits] = useState<TransitAspect[]>([]);
  const [keyMoments, setKeyMoments] = useState<KeyMoment[]>([]);
  const [tideFlips, setTideFlips] = useState<PolarityFlip[]>([]);
  const [nextMajor, setNextMajor] = useState<UpcomingEvent | null>(null);
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);
  const [expandedAspect, setExpandedAspect] = useState<number | null>(null);

  useEffect(() => {
    setMoon(currentMoon());
    setMoonShift(hoursUntilMoonSignChange());
    setLunation(nextLunation());
    setRetrogrades(currentRetrogrades());
  }, []);

  useEffect(() => {
    if (!blueprint) return;
    setTodayHd(userTransits(blueprint));
    setForecast(upcomingForecast(blueprint.natal, 7));
    // Compute today's top transits client-side so they show even when the
    // LLM endpoint is unavailable.
    const { aspects } = todaysTransits(blueprint.natal);
    setLiveTransits(pickTopAspects(aspects, 3));
    setKeyMoments(imminentReturns(ageInYears(blueprint.birth.iso)));
    // Cycles that just flipped (within last 14 days) — surface as a small
    // "the tides changed this week" callout linking to /polarity.
    const flips = polarityFlips(blueprint.birth.iso);
    setTideFlips(flips.filter((f) => f.daysSinceStart <= 14));
    // Find the next "major" event: return or station inside the next 2 years,
    // ignoring flips (they show in 'tides this week' already).
    const upcoming = upcomingEventsFeed(blueprint.birth.iso, new Date(), {
      horizonYears: 2,
      includeFlips: false,
    });
    setNextMajor(upcoming[0] ?? null);
  }, [blueprint]);

  useEffect(() => {
    if (!blueprint) return;
    setSolarReturnDays(daysUntilSolarReturn(blueprint.natal.sun.longitude));
  }, [blueprint]);

  // Look across the past 5 years for the journal entry closest in calendar
  // date to today. Closer day wins over more-recent year, so an exact
  // 5-year-ago anniversary isn't shadowed by a 3-days-off 1-year-ago one.
  // Re-runs when the day rolls over so an overnight-open tab catches the
  // new day's anniversary (and drops yesterday's).
  useEffect(() => {
    setAnniversary(bestAnniversary());
  }, [todayIso]);

  // Read the welcome flag exactly once. SSR-safe via the existing client
  // boundary.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem('liraydhas.welcome.v1') === '1') {
      setShowWelcome(true);
    }
  }, []);

  const isSolarReturnToday =
    solarReturnDays !== null && (solarReturnDays < 1 || solarReturnDays > 364.5);

  useEffect(() => {
    const t = setTimeout(() => { if (!blueprint) router.replace('/onboarding'); }, 60);
    return () => clearTimeout(t);
  }, [blueprint, router]);

  useEffect(() => {
    if (!blueprint) return;
    // Re-runs when the calendar date rolls over so the stale yesterday's
    // reading on a kept-open tab gets refreshed automatically.
    if (daily && daily.date === todayIso) return;
    void fetchDaily();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blueprint, todayIso]);

  async function fetchDaily() {
    if (!blueprint) return;
    // Capture the blueprint identity at call-time so we can detect if it
    // changed (e.g. user erased blueprint mid-flight) and avoid writing
    // a stale daily report to the new store state.
    const startBlueprint = blueprint;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/daily', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ blueprint: startBlueprint, localDate: localDateStr() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `error ${res.status}`);
      }
      const data = (await res.json()) as DailyReport;
      // If the user blew away or replaced their blueprint while the
      // request was in flight, drop this response.
      if (useStore.getState().blueprint !== startBlueprint) return;
      setDaily(data);
    } catch (e: unknown) {
      setError(friendlyError(e instanceof Error ? e.message : null));
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
    <PullToRefresh onRefresh={fetchDaily}>
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
        {(daily?.transits && daily.transits.length > 0) || liveTransits.length > 0 ? (
          <p className="mt-3 serif text-ink-dim text-[15px] italic">
            today is {dailyVibe(daily?.transits ?? liveTransits, positionInCycles(ageInYears(blueprint.birth.iso)))}.
          </p>
        ) : null}
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
        {moonShift && moonShift.hours < 18 && (
          <p className="small-label caps text-ink-faint mt-1">
            moon enters {moonShift.nextSign.toLowerCase()} in {Math.max(1, Math.round(moonShift.hours))}h
          </p>
        )}
        {retrogrades.length > 0 && (
          <p className="small-label caps text-ink-faint mt-2">
            ℞ {retrogrades.join(' · ')}
          </p>
        )}
        <FirstTimeIntro storeKey="liraydhas.today.intro.dismissed.v1" learnHref="/learn#astrology">
          <p>
            The reading below is written from{' '}
            <span className="text-ink">your three tightest transits today</span>{' '}
            — where the planets currently sit relative to your natal chart —
            plus any natal gates being touched right now and the current
            phase of your life cycles.
          </p>
          <p>
            Pull down anywhere on this screen to refresh the day's reading.
          </p>
        </FirstTimeIntro>
      </header>

      {(() => {
        const ch = currentChapter(ageInYears(blueprint.birth.iso));
        if (!ch) return null;
        return (
          <section className="mb-6 border-l-2 pl-3" style={{ borderLeftColor: '#3a3a3a' }}>
            <p className="small-label caps text-ink-faint">
              this chapter · <span className="text-ink">{ch.label.toLowerCase()}</span>
              <span className="ml-2 text-[10px]">ages {ch.startAge}–{ch.endAge}</span>
            </p>
          </section>
        );
      })()}

      {tideFlips.length > 0 && (
        <section className="mb-6">
          <p className="small-label caps text-ink-faint mb-2">the tides this week</p>
          <ul className="space-y-1">
            {tideFlips.map((f) => (
              <li
                key={f.cycle.key}
                className="flex justify-between text-[12.5px] border-l-2 pl-2 py-0.5"
                style={{ borderLeftColor: f.cycle.color }}
              >
                <span className="text-ink-dim">
                  <span className="serif text-[12px] text-ink-dim mr-1" aria-hidden>{f.cycle.glyph}</span>
                  <span className="text-ink">{f.cycle.label.toLowerCase()}</span>{' '}
                  flipped to <span className="text-ink">{f.positive ? 'rising' : 'descending'}</span>
                </span>
                <span className="tabular-nums text-ink-faint">{Math.round(f.daysSinceStart)}d ago</span>
              </li>
            ))}
          </ul>
          <a href="/polarity" className="btn-ghost mt-2 inline-block">see the stack →</a>
        </section>
      )}

      {keyMoments.length > 0 && (
        <section className="mb-8 border border-accent/40 p-3" style={{ borderColor: '#3a1a1a' }}>
          {keyMoments.map((k) => (
            <p key={k.cycle.key} className="text-[12px] text-accent caps" style={{ letterSpacing: '0.18em' }}>
              {k.cycle.label} —{' '}
              {k.direction === 'approaching'
                ? `in ${Math.round(k.monthsAway)} month${Math.round(k.monthsAway) === 1 ? '' : 's'}`
                : `${Math.round(-k.monthsAway)} month${Math.round(-k.monthsAway) === 1 ? '' : 's'} ago`}
            </p>
          ))}
          <p className="text-[12px] text-ink-dim mt-1 italic serif">
            A major chapter mark. The themes around you right now are not small.
          </p>
        </section>
      )}

      {nextMajor && keyMoments.length === 0 && (
        <section className="mb-6 border-l-2 pl-3" style={{ borderLeftColor: nextMajor.color }}>
          <p className="small-label caps text-ink-faint">your next major event</p>
          <p className="serif text-[15px] text-ink mt-1">
            {nextMajor.cycle && (
              <span className="text-ink-dim serif text-[13px] mr-1.5" aria-hidden>{nextMajor.cycle.glyph}</span>
            )}
            {nextMajor.title}
            <span className="text-ink-faint text-[12px] ml-2">{nextMajor.detail}</span>
          </p>
          <p className="text-[11px] text-ink-faint caps mt-0.5" style={{ letterSpacing: '0.08em' }}>
            in {nextMajor.daysAhead < 365 ? `${Math.round(nextMajor.daysAhead)} days` : `${(nextMajor.daysAhead / 365.25).toFixed(1)} years`} ·{' '}
            {nextMajor.date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
          </p>
          <a href="/year" className="small-label caps text-[10px] text-ink-faint hover:text-ink mt-1 inline-block">see the year ahead →</a>
        </section>
      )}

      {anniversary?.day && (() => {
        const a = anniversary.day;
        const date = new Date(a.dateIso + 'T12:00:00');
        const niceDate = date.toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
        const yearsLabel = anniversary.yearsAgo === 1 ? 'a year ago today' : `${anniversary.yearsAgo} years ago today`;
        // "the sky then" caption — pulled from the snapshot if we have it.
        const thenBits: string[] = [];
        if (a.snapshot?.ageYears != null) thenBits.push(`age ${a.snapshot.ageYears.toFixed(1)}`);
        if (a.snapshot?.moonPhase) {
          thenBits.push(
            a.snapshot.moonSign
              ? `${a.snapshot.moonPhase} in ${a.snapshot.moonSign.toLowerCase()}`
              : a.snapshot.moonPhase
          );
        }
        if (a.snapshot?.chapter) thenBits.push(a.snapshot.chapter.toLowerCase());
        return (
          <section className="mb-8 border-l-2 border-accent pl-3 py-1">
            <p className="small-label caps text-accent" style={{ letterSpacing: '0.18em' }}>
              ✦ {yearsLabel}
            </p>
            <p className="small-label caps text-ink-faint mt-0.5" style={{ letterSpacing: '0.1em' }}>
              {niceDate.toLowerCase()}
              {a.headline && <> · {a.headline}</>}
            </p>
            {a.paragraph && (
              <p className="serif text-[14px] text-ink-dim mt-2 leading-relaxed line-clamp-3">
                {a.paragraph}
              </p>
            )}
            {a.note && (
              <p className="serif italic text-[13px] text-ink mt-2 leading-relaxed line-clamp-2">
                you wrote: "{a.note}"
              </p>
            )}
            {thenBits.length > 0 && (
              <p
                className="small-label caps text-ink-faint mt-2 text-[10px]"
                style={{ letterSpacing: '0.14em' }}
              >
                the sky then · {thenBits.join(' · ')}
              </p>
            )}
            <a href="/saved" className="small-label caps text-[10px] text-ink-faint hover:text-ink mt-2 inline-block">
              open in journal →
            </a>
          </section>
        );
      })()}

      {showWelcome && (
        <section className="mb-8 border border-accent p-4 fade-in">
          <p
            className="small-label caps text-accent"
            style={{ letterSpacing: '0.18em' }}
          >
            ✦ your first reading
          </p>
          <p className="serif text-[14.5px] text-ink mt-2 leading-relaxed">
            The reading below is for today only — it's built from your
            chart and the sky right now. Save it with{' '}
            <span className="text-ink">☆ save</span> if you want to keep
            it. There's nothing here to learn first; this can just be
            the start.
          </p>
          <button
            type="button"
            onClick={() => {
              hapticTap('light');
              try { window.localStorage.removeItem('liraydhas.welcome.v1'); } catch { /* ignore */ }
              setShowWelcome(false);
            }}
            className="small-label caps text-ink-faint hover:text-ink mt-3"
            style={{ letterSpacing: '0.16em' }}
          >
            begin
          </button>
        </section>
      )}

      <section className="min-h-[200px]">
        {loading && !daily && <DailyParagraphSkeleton />}
        {error && (
          <div className="border border-hairline p-4 mb-4">
            <p className="text-accent text-[13px]">{error}</p>
            <button className="btn-ghost mt-3" onClick={() => { hapticTap('light'); void fetchDaily(); }}>try again</button>
          </div>
        )}
        {daily?.paragraph && (
          <p className="body-prose serif text-ink">
            {daily.paragraph}
          </p>
        )}
      </section>

      {(() => {
        const transitsToShow = (daily?.transits && daily.transits.length > 0) ? daily.transits : liveTransits;
        if (transitsToShow.length === 0) return null;
        return (
          <section className="mt-12">
            <p className="small-label caps mb-3">today's transits</p>
            <ul className="space-y-0">
              {transitsToShow.map((t, i) => {
                const open = expandedAspect === i;
                const isExact = t.orb < 0.5;
                return (
                  <li key={i} className="border-b border-hairline">
                    <button
                      onClick={() => setExpandedAspect(open ? null : i)}
                      className="w-full flex justify-between items-baseline text-[13px] text-ink-dim py-2 text-left"
                    >
                      <span>
                        <span className="text-ink">{t.transitPlanet}</span>{' '}
                        {PRETTY_ASPECT[t.aspect]}{' '}
                        natal <span className="text-ink">{t.natalPlanet}</span>
                        {isExact && <span className="text-accent ml-1.5 caps small-label">exact</span>}
                      </span>
                      <span className={`tabular-nums ${isExact ? 'text-accent' : ''}`}>{t.orb.toFixed(1)}°</span>
                    </button>
                    {open && (
                      <p className="text-[12.5px] text-ink-dim pb-2 serif italic">
                        {aspectMeaning(t.transitPlanet, t.natalPlanet, t.aspect)}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })()}

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

      {(() => {
        const dates = history.map((h) => h.date);
        const streak = readingStreak(dates, todayIso);
        if (streak < 2) return null;
        return (
          <section className="mt-10 text-center">
            <p className="small-label caps text-ink-faint">
              {streak} days in a row
            </p>
          </section>
        );
      })()}

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

        {/* Compact 7-cycle phase strip — mirrors /polarity glance */}
        <div className="mt-5">
          <p className="small-label caps text-ink-faint mb-1.5">tides right now</p>
          <a href="/polarity" className="flex items-end gap-1.5">
            {positionInCycles(ageInYears(blueprint.birth.iso)).map((p) => (
              <span
                key={p.cycle.key}
                className="flex flex-col items-center gap-0.5"
                title={`${p.cycle.label}: ${p.positive ? 'rising' : 'descending'}`}
              >
                <span
                  className="block w-2.5 h-2.5"
                  style={{ background: p.cycle.color, opacity: p.positive ? 0.95 : 0.3 }}
                />
                <span className="text-[8px] text-ink-faint" style={{ lineHeight: 1 }}>
                  {p.positive ? '↑' : '↓'}
                </span>
              </span>
            ))}
            <span className="text-[10px] text-ink-faint caps ml-1" style={{ letterSpacing: '0.16em' }}>
              see all →
            </span>
          </a>
        </div>
      </section>

      {/* One quiet question per day — header swaps "today's / this
          afternoon's / tonight's" with the local hour. Same question all
          day, different one tomorrow. Voice-matched. */}
      <section className="mt-12 border-t border-hairline pt-6">
        <p
          className="small-label caps text-ink-faint mb-2"
          style={{ letterSpacing: '0.18em' }}
        >
          {questionLabelForHour(new Date().getHours())}
        </p>
        <p className="serif italic text-[16px] text-ink leading-relaxed">
          {questionForDate(todayIso)}
        </p>
        <p
          className="small-label caps text-ink-faint mt-2 text-[10px]"
          style={{ letterSpacing: '0.14em' }}
        >
          sit with it · or add it to today's note above
        </p>
      </section>

      {/* Deterministic 'today at a glance' — always present, copy-friendly */}
      <section className="mt-12 border-t border-hairline pt-6">
        <div className="flex items-baseline justify-between mb-2">
          <p className="small-label caps">today at a glance</p>
          <button
            type="button"
            className="small-label caps text-[10px] text-ink-faint hover:text-ink"
            onClick={async () => {
              const txt = todayGlanceText({
                blueprint,
                transits: daily?.transits ?? liveTransits,
                moon,
                retrogrades,
                recentFlips: tideFlips,
                todayLocal: today,
              });
              try {
                if (navigator.share) {
                  await navigator.share({ title: 'Today', text: txt });
                } else {
                  await navigator.clipboard.writeText(txt);
                  const el = document.getElementById('today-glance-toast');
                  if (el) { el.style.opacity = '1'; window.setTimeout(() => { el.style.opacity = '0'; }, 1500); }
                }
              } catch {/* cancelled */}
            }}
          >
            share
          </button>
        </div>
        <pre className="text-[12.5px] text-ink-dim font-mono whitespace-pre-wrap leading-relaxed">
{todayGlanceText({
  blueprint,
  transits: daily?.transits ?? liveTransits,
  moon,
  retrogrades,
  recentFlips: tideFlips,
  todayLocal: today,
})}
        </pre>
        <div id="today-glance-toast" className="small-label caps text-accent text-right" style={{ opacity: 0, transition: 'opacity 300ms ease', height: '1em' }}>copied</div>
      </section>

      {daily?.paragraph && (() => {
        // (todayIso comes from useToday at the top of the component,
        // so a midnight rollover updates the save button's dateIso.)
        const tightest = (daily.transits ?? liveTransits)[0];
        const headline = tightest
          ? `${tightest.transitPlanet} ${tightest.aspect} ${tightest.natalPlanet} · ${tightest.orb.toFixed(1)}°`
          : undefined;
        const ch = currentChapter(ageInYears(blueprint.birth.iso));
        return (
          <section className="mt-8">
            <SaveDayButton
              dateIso={todayIso}
              paragraph={daily.paragraph}
              headline={headline}
              snapshot={{
                moonPhase: moon?.name?.toLowerCase(),
                moonSign: moon?.moonSign,
                chapter: ch?.label,
                ageYears: Math.round(ageInYears(blueprint.birth.iso) * 10) / 10,
              }}
            />
          </section>
        );
      })()}

      <section className="mt-6 mb-2 flex flex-wrap items-center justify-between gap-2">
        <button className="btn-ghost" onClick={() => { hapticTap('light'); void fetchDaily(); }} disabled={loading}>
          {loading ? 'refreshing…' : 'refresh report'}
        </button>
        {daily?.paragraph && typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            className="btn-ghost"
            onClick={async () => {
              try {
                await (navigator as Navigator & { share: (data: ShareData) => Promise<void> })
                  .share({
                    title: 'Liraydhas — today',
                    text: daily.paragraph,
                  });
              } catch {
                // user cancelled; ignore
              }
            }}
          >
            share paragraph
          </button>
        )}
        <a href="/about" className="btn-ghost">about →</a>
      </section>
    </main>
    </PullToRefresh>
  );
}

function DailyParagraphSkeleton() {
  return (
    <div>
      <p className="small-label caps text-ink-faint mb-3" style={{ letterSpacing: '0.18em' }}>
        composing today's reading
      </p>
      <div className="space-y-3 animate-pulse">
        <div className="h-5 bg-hairline w-11/12" />
        <div className="h-5 bg-hairline w-full" />
        <div className="h-5 bg-hairline w-10/12" />
        <div className="h-5 bg-hairline w-9/12" />
        <div className="h-5 bg-hairline w-8/12" />
      </div>
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

