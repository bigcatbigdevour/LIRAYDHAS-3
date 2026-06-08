'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import ArcDiagram, { type ArcSelection } from '@/components/ArcDiagram';
import FirstTimeIntro from '@/components/FirstTimeIntro';
import ScrollHint from '@/components/ScrollHint';
import { CYCLES, ageInYears, positionInCycles } from '@/lib/cycles';
import { CYCLE_LENSES, arcDescription } from '@/lib/cycleLenses';
import { LIFE_STATIONS } from '@/lib/lifeStations';
import { LIFE_CHAPTERS, currentChapter } from '@/lib/lifeChapters';
import { whereYouAre, prettyDays } from '@/lib/whereYouAre';

export default function ArcsPage() {
  const router = useRouter();
  const blueprint = useStore((s) => s.blueprint);
  const [selected, setSelected] = useState<ArcSelection | null>(null);
  const [focusAge, _setFocusAge] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);

  // Wrap setFocusAge so it also reflects the value in the URL — gives
  // shareable deep-links like /arcs?age=29
  function setFocusAge(v: number | null) {
    _setFocusAge(v);
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (v === null) params.delete('age');
    else params.set('age', v.toFixed(1));
    const q = params.toString();
    const url = q ? `?${q}` : window.location.pathname;
    window.history.replaceState(null, '', url);
  }

  // On mount, hydrate focusAge from ?age=N if present
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const a = new URLSearchParams(window.location.search).get('age');
    if (a !== null) {
      const n = parseFloat(a);
      if (Number.isFinite(n) && n >= 0 && n <= 92) _setFocusAge(n);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { if (!blueprint) router.replace('/onboarding'); }, 60);
    return () => clearTimeout(t);
  }, [blueprint, router]);

  // Auto-scrub animation: when playing, advance focusAge from 0 → 92
  // over ~25 seconds, then stop. Manual scrubbing interrupts.
  useEffect(() => {
    if (!playing) return;
    const totalMs = 25_000;
    const fps = 30;
    const stepMs = 1000 / fps;
    const totalSteps = totalMs / stepMs;
    let step = 0;
    // start from current focus or 0
    const startAge = focusAge ?? 0;
    const id = window.setInterval(() => {
      step++;
      const progress = step / totalSteps;
      const a = startAge + (92 - startAge) * progress;
      if (a >= 92 || step >= totalSteps) {
        _setFocusAge(92);
        setPlaying(false);
        window.clearInterval(id);
        return;
      }
      _setFocusAge(a);
    }, stepMs);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  if (!blueprint) return null;

  const age = ageInYears(blueprint.birth.iso);

  return (
    <main className="page max-w-3xl mx-auto fade-in">
      <header className="pb-6">
        <p className="small-label caps">Arcs</p>
        <h1 className="h-display serif mt-3">Every cycle, drawn.</h1>
        {(() => {
          const w = whereYouAre(blueprint);
          return (
            <div className="mt-3 border-l-2 border-accent pl-3 py-1.5">
              <p className="text-[15px] text-ink serif">
                You are <span className="text-accent">{w.ageYears.toFixed(2)} years old</span>.
                <span className="text-ink-dim"> · {w.ageDays.toLocaleString()} days alive.</span>
              </p>
              <p className="text-[12.5px] text-ink-dim serif mt-1 leading-relaxed">
                {w.chapter && (
                  <>In <span className="text-ink">{w.chapter.label.toLowerCase()}</span> (ages {w.chapter.startAge}–{w.chapter.endAge}). </>
                )}
                Next chapter in <span className="text-ink">{prettyDays(w.daysUntilNextChapter)}</span>.
                {w.nextStation && (
                  <> · Next major life-station ({w.nextStation.station.label.toLowerCase()}): <span className="text-ink">{prettyDays(w.nextStation.daysUntil)}</span> away.</>
                )}
              </p>
            </div>
          );
        })()}
        {(() => {
          // Atmospheric one-liner pulled from the user's age decade.
          const decade = Math.floor(age / 10) * 10;
          const moods: Record<number, string> = {
            0:  'you are still inside your first Saturn',
            10: 'your first Jupiter is closing, your first Saturn opening',
            20: 'the structures of adulthood are being chosen',
            30: 'the borrowed years are being audited',
            40: 'the midpoint, the pruning, the second half being chosen',
            50: 'the wound is becoming the teaching',
            60: 'the legacy is being laid down',
            70: 'the integration, the slow handing off',
            80: 'late elderhood, the long sky',
            90: 'the long sky',
          };
          const mood = moods[decade] ?? '';
          if (!mood) return null;
          return (
            <p className="serif italic text-[16px] text-ink mt-3">
              you are <span className="text-accent">{age.toFixed(0)}</span>{' '}
              — {mood}.
            </p>
          );
        })()}
        <p className="serif text-[14.5px] text-ink-dim mt-3 leading-relaxed max-w-xl">
          Most astrology gives you a snapshot. This gives you the shape of
          your whole life. Seven cycles — Solar, Mars, Jupiter, Saturn,
          Nodal, Chiron, the Progressed Moon — drawn end to end across a
          human lifespan. The brighter arcs are the ones you are currently
          inside. The white line is right now.
        </p>
        <FirstTimeIntro storeKey="liraydhas.arcs.intro.dismissed.v1" learnHref="/learn#cycles">
          <p>
            Most astrology gives you a horoscope for today. This gives you the
            shape of your whole life. Each colored arc below is one cycle of a
            planet — and the slower the planet, the wider the arc. Saturn takes
            29.5 years to return to where it was when you were born. Chiron
            takes 50. The arcs are those orbits drawn end to end across your
            lifespan.
          </p>
          <p>
            The white vertical line is right now — where you are inside every
            arc at once. The ◆ diamonds are the points where multiple cycles
            cross at the same age (Saturn return, midlife, Chiron return) —
            the "everyone goes through this at X" moments.
          </p>
        </FirstTimeIntro>
        <div className="mt-3 border border-hairline p-3 text-[12.5px] text-ink-dim serif leading-relaxed max-w-md">
          <p className="text-ink mb-1.5 small-label caps" style={{ letterSpacing: '0.14em' }}>how to use this</p>
          <ol className="space-y-1 list-decimal list-inside">
            <li><span className="text-ink">Drag the slider</span> to explore any age — see what cycles you were inside.</li>
            <li><span className="text-ink">Tap ▶</span> to watch your whole life animate from 0 to 92.</li>
            <li><span className="text-ink">Tap any arc</span> for what that period of your life holds.</li>
            <li><span className="text-ink">Tap a ◆ diamond</span> to jump to a major life-station (Saturn return, Chiron return, etc.).</li>
          </ol>
        </div>
      </header>

      <nav className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[10px] caps text-ink-faint border-t border-b border-hairline py-1.5" style={{ letterSpacing: '0.12em' }}>
        <a href="#chart" className="hover:text-ink">chart</a>
        <a href="#chapters" className="hover:text-ink">chapters</a>
        <a href="#read" className="hover:text-ink">how to read</a>
        <a href="#stations" className="hover:text-ink">stations</a>
        <a href="#cycles" className="hover:text-ink">each cycle</a>
        <a href="/year" className="hover:text-ink text-accent">/year →</a>
      </nav>

      <section id="chart" className="mt-6 scroll-mt-4">
        <ArcDiagram
          birthIso={blueprint.birth.iso}
          selected={selected}
          onSelect={setSelected}
          focusAge={focusAge}
          onSelectStation={(stationAge) => {
            // scroll the matching station card into view
            const el = document.getElementById(`station-${String(stationAge).replace('.', '_')}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.classList.add('station-flash');
              window.setTimeout(() => el.classList.remove('station-flash'), 2000);
            }
          }}
        />

        {/* Age scrubber */}
        <div className="mt-4">
          <p className="small-label caps text-ink-faint mb-2" style={{ letterSpacing: '0.18em' }}>
            drag · or press play
          </p>
          <div className="flex items-center justify-between text-[11px] mb-1 gap-2">
            <span className="small-label caps text-ink-faint shrink-0">
              {focusAge === null ? 'showing today' : playing ? 'playing' : 'scrubbing'}
            </span>
            <span className="tabular-nums text-ink-dim text-right">
              {(() => {
                const a = focusAge ?? age;
                const birthMs = new Date(blueprint.birth.iso).getTime();
                const d = new Date(birthMs + a * 365.2425 * 86400 * 1000);
                const dateStr = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
                return (
                  <>
                    <span className="text-accent">age {a.toFixed(1)}</span>
                    <span className="text-ink-faint ml-1.5">· {dateStr}</span>
                  </>
                );
              })()}
              {focusAge !== null && (
                <>
                  <button
                    className="ml-2 text-ink-faint hover:text-ink underline"
                    onClick={() => setFocusAge(null)}
                    type="button"
                  >
                    reset
                  </button>
                  <button
                    className="ml-2 text-accent hover:opacity-80 underline"
                    onClick={async () => {
                      try {
                        if (navigator.share) {
                          await navigator.share({
                            title: `Liraydhas — age ${focusAge.toFixed(1)}`,
                            url: window.location.href,
                          });
                        } else {
                          await navigator.clipboard.writeText(window.location.href);
                          // tiny visual confirmation
                          const el = document.getElementById('share-toast');
                          if (el) {
                            el.style.opacity = '1';
                            window.setTimeout(() => { el.style.opacity = '0'; }, 1500);
                          }
                        }
                      } catch {
                        // user cancelled / no permission — ignore
                      }
                    }}
                    type="button"
                  >
                    share this view
                  </button>
                </>
              )}
            </span>
          </div>
          <div
            id="share-toast"
            className="small-label caps text-accent text-right"
            style={{ opacity: 0, transition: 'opacity 300ms ease', height: '1em' }}
          >
            link copied
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (playing) {
                  setPlaying(false);
                } else {
                  // start from age 0 to 92
                  _setFocusAge(0);
                  setPlaying(true);
                }
              }}
              className="text-[16px] w-12 h-12 flex items-center justify-center border border-accent text-accent hover:bg-accent hover:text-bg transition-colors shrink-0"
              aria-label={playing ? 'pause life animation' : 'play life animation'}
              title={playing ? 'pause' : 'play your life as a movie'}
            >
              {playing ? '❚❚' : '▶'}
            </button>
            <div className="flex-1 relative">
              {/* "today" pin floats above the slider track at today's age */}
              <div
                className="absolute -top-3 flex flex-col items-center pointer-events-none"
                style={{ left: `calc(${(age / 92) * 100}% - 14px)`, width: 28 }}
                aria-hidden
              >
                <span
                  className="text-[8px] text-ink-faint caps"
                  style={{ letterSpacing: '0.18em', opacity: focusAge === null ? 1 : 0.55 }}
                >
                  today
                </span>
                <span
                  className="block w-px h-2 bg-ink"
                  style={{ opacity: focusAge === null ? 1 : 0.4 }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={92}
                step={0.1}
                value={focusAge ?? age}
                onChange={(e) => {
                  if (playing) setPlaying(false);
                  const v = parseFloat(e.currentTarget.value);
                  if (Math.abs(v - age) < 0.15) setFocusAge(null);
                  else setFocusAge(v);
                }}
                className="w-full age-scrubber"
                aria-label="Scrub through your life to explore any age"
              />
              {/* decade tick labels under the slider */}
              <div className="flex justify-between mt-1 text-[8px] text-ink-faint caps" style={{ letterSpacing: '0.12em' }}>
                <span>0</span>
                <span>20</span>
                <span>40</span>
                <span>60</span>
                <span>80</span>
                <span>92</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live caption while scrubbing/playing: nearest station name */}
        {focusAge !== null && (() => {
          let nearest: typeof LIFE_STATIONS[number] | null = null;
          let nearestDist = Infinity;
          for (const s of LIFE_STATIONS) {
            const d = Math.abs(focusAge - s.age);
            if (d < nearestDist) { nearest = s; nearestDist = d; }
          }
          if (!nearest || nearestDist > 4) return null;
          return (
            <p
              className="text-center serif text-[13px] mt-2 fade-in"
              style={{
                color: nearestDist < 1 ? '#8b3a3a' : '#888',
                opacity: 1 - Math.min(0.6, nearestDist / 6),
              }}
            >
              {nearestDist < 0.5
                ? `at the ${nearest.label.toLowerCase()}`
                : `${nearestDist.toFixed(1)}y ${focusAge < nearest.age ? 'before' : 'after'} the ${nearest.label.toLowerCase()}`}
            </p>
          );
        })()}

        {/* Scrub-result panel: what's active at the focused age */}
        {focusAge !== null && (() => {
          const focusPos = positionInCycles(focusAge);
          const nowPos = positionInCycles(age);
          const focusRising = focusPos.filter((p) => p.positive).length;
          const nowRising = nowPos.filter((p) => p.positive).length;
          return (
            <div className="mt-3 border border-hairline p-3 fade-in">
              <div className="flex items-baseline justify-between mb-2">
                <p className="small-label caps text-ink-faint">
                  at age {focusAge.toFixed(1)} vs now ({age.toFixed(1)})
                </p>
                <p className="small-label caps tabular-nums">
                  <span className="text-accent">{focusRising}↑ {7 - focusRising}↓</span>
                  <span className="text-ink-faint mx-2">·</span>
                  <span className="text-ink-dim">{nowRising}↑ {7 - nowRising}↓ now</span>
                </p>
              </div>
              <ul className="space-y-0.5 text-[12.5px]">
                {focusPos.map((p, i) => {
                  const now = nowPos[i];
                  const flipped = now.positive !== p.positive;
                  return (
                    <li key={p.cycle.key} className="flex justify-between">
                      <span className="flex items-center gap-2 text-ink-dim">
                        <span className="inline-block w-2 h-px" style={{ background: p.cycle.color }} />
                        <span className="text-ink">{p.cycle.label.toLowerCase()}</span>
                        {flipped && (
                          <span className="text-accent text-[10px]" style={{ letterSpacing: '0.1em' }}>
                            ≠ now
                          </span>
                        )}
                      </span>
                      <span className="tabular-nums text-ink-faint">
                        {p.positive ? 'rising' : 'descending'} · {Math.round(p.fraction * 100)}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })()}

        {!selected && focusAge === null && <ScrollHint label="tap · a diamond · scrub · or scroll" />}
      </section>

      {/* Detail panel — what does the selected arc mean */}
      {selected && (
        <section className="mt-8 border border-hairline p-4 fade-in">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3" style={{ background: selected.color }} />
              <span className="small-label caps">{selected.cycleLabel}</span>
            </div>
            <span className="small-label caps text-ink-faint">
              ages {selected.ageStart.toFixed(1)} – {selected.ageEnd.toFixed(1)}
            </span>
          </div>
          <p className="body-prose serif text-ink whitespace-pre-line mt-2">
            {arcDescription({
              cycle: CYCLES.find((c) => c.key === selected.cycleKey)!,
              nthCycle: selected.nthCycle,
              ageStart: selected.ageStart,
              ageEnd: selected.ageEnd,
            })}
          </p>
          {age >= selected.ageStart && age < selected.ageEnd && (
            <p className="small-label caps mt-3 text-accent">you are inside this arc right now</p>
          )}
        </section>
      )}

      {/* Chapters of life — current chapter banner + full list */}
      <section id="chapters" className="mt-12 scroll-mt-4">
        <h2 className="h-display serif mb-3" style={{ fontSize: '1.5rem' }}>
          Chapters of a life.
        </h2>
        {(() => {
          const ch = currentChapter(age);
          if (!ch) return null;
          const pct = ((age - ch.startAge) / (ch.endAge - ch.startAge)) * 100;
          return (
            <div className="border-l-2 border-accent pl-3 mb-6">
              <p className="small-label caps text-accent">
                you are in · {ch.label.toLowerCase()}
              </p>
              <p className="small-label caps text-ink-faint mt-0.5">
                ages {ch.startAge} – {ch.endAge} · {pct.toFixed(0)}% through
              </p>
              <p className="serif text-[14px] text-ink-dim mt-1.5 leading-relaxed">
                {ch.description}
              </p>
            </div>
          );
        })()}
        <ul className="space-y-3">
          {LIFE_CHAPTERS.map((ch) => {
            const isHere = age >= ch.startAge && age < ch.endAge;
            const isPast = age >= ch.endAge;
            return (
              <li
                key={ch.label}
                className={`border-l pl-3 ${isHere ? 'border-accent' : 'border-hairline'}`}
              >
                <div className="flex items-baseline justify-between">
                  <p className={`serif text-[15px] ${isHere ? 'text-ink' : isPast ? 'text-ink-faint' : 'text-ink-dim'}`}>
                    {ch.label}
                  </p>
                  <span className="small-label caps text-ink-faint">
                    {ch.startAge} – {ch.endAge}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Always-visible legend / key */}
      <section id="read" className="mt-12 scroll-mt-4">
        <h2 className="h-display serif mb-3" style={{ fontSize: '1.5rem' }}>
          How to read this chart.
        </h2>
        <ul className="space-y-2 text-[13.5px] text-ink-dim serif">
          <li>
            <span className="text-ink">The bottom line</span> is your life,
            ages 0 to 92, left to right.
          </li>
          <li>
            <span className="text-ink">Each tick</span> on the bottom line is
            a moment when a cycle returns to where it started.
          </li>
          <li>
            <span className="text-ink">Each curved arc</span> connects two
            consecutive returns of the same cycle — one full period of that
            cycle.
          </li>
          <li>
            <span className="text-ink">Each color</span> is a different cycle.
            The slower the cycle, the wider its arcs.
          </li>
          <li>
            <span className="text-ink">The vertical white line</span> is today.
            It is where you are inside every cycle at once.
          </li>
        </ul>
      </section>

      {/* Convergence stations — ages where multiple cycles align */}
      <section id="stations" className="mt-12 scroll-mt-4">
        <h2 className="h-display serif mb-2" style={{ fontSize: '1.5rem' }}>
          Where the cycles converge.
        </h2>
        <p className="text-ink-dim text-[13.5px] serif leading-relaxed mb-4">
          Certain ages feel universal — adolescence at twelve, the Saturn
          return at twenty-nine, midlife around forty-five. These are not
          arbitrary. They are the points where multiple cycles cross at the
          same place on the timeline above. The "everyone goes through this"
          moments are when the math literally stacks.
        </p>
        <ul className="space-y-5">
          {LIFE_STATIONS.map((s) => {
            const isHere = Math.abs(age - s.age) < 2;
            const isPast = age > s.age + 1;
            const isFocused = focusAge !== null && Math.abs(focusAge - s.age) < 0.2;
            return (
              <li
                key={s.age}
                id={`station-${String(s.age).replace('.', '_')}`}
                className={`border-l pl-3 transition-colors ${isFocused ? 'border-accent' : 'border-hairline'}`}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => {
                    // tap a station card → scroll up, then animate the chart
                    // from the user's current focus to this station's age.
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    const start = focusAge ?? age;
                    const target = s.age;
                    if (Math.abs(target - start) < 0.5) {
                      setFocusAge(target);
                      return;
                    }
                    const durationMs = 1200;
                    const fps = 30;
                    const totalSteps = Math.round((durationMs / 1000) * fps);
                    let step = 0;
                    const id = window.setInterval(() => {
                      step++;
                      const t = step / totalSteps;
                      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
                      const a2 = start + (target - start) * eased;
                      _setFocusAge(a2);
                      if (step >= totalSteps) {
                        window.clearInterval(id);
                        setFocusAge(target);
                      }
                    }, 1000 / fps);
                  }}
                >
                  <div className="flex items-baseline justify-between">
                    <p className="serif text-[16px] text-ink">
                      {s.label}
                    </p>
                    <span className={`small-label caps ${isHere ? 'text-accent' : isPast ? 'text-ink-faint' : 'text-ink-dim'}`}>
                      age {s.age}
                      {isHere && ' · you'}
                      {isPast && ' · past'}
                      {isFocused && !isHere && ' · scrubbed'}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-ink-faint caps mt-0.5" style={{ letterSpacing: '0.08em' }}>
                    {s.convergence}
                  </p>
                  <p className="text-[14px] text-ink-dim serif mt-1 leading-relaxed">
                    {s.description}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Cycle-by-cycle multi-lens guide */}
      <section id="cycles" className="mt-16 space-y-10 scroll-mt-4">
        <h2 className="h-display serif" style={{ fontSize: '1.5rem' }}>
          Each cycle, four ways.
        </h2>
        {CYCLES.map((c) => {
          const lens = CYCLE_LENSES[c.key];
          if (!lens) return null;
          const n = blueprint.natal;
          const natalAnchor: { label: string; sign: string; degree: number } | null = (() => {
            switch (c.key) {
              case 'solar':   return { label: 'natal Sun',     sign: n.sun.sign,     degree: n.sun.degree };
              case 'mars':    return { label: 'natal Mars',    sign: n.mars.sign,    degree: n.mars.degree };
              case 'jupiter': return { label: 'natal Jupiter', sign: n.jupiter.sign, degree: n.jupiter.degree };
              case 'saturn':  return { label: 'natal Saturn',  sign: n.saturn.sign,  degree: n.saturn.degree };
              case 'nodal':   return { label: 'North Node',    sign: n.northNode.sign, degree: n.northNode.degree };
              case 'chiron':  return n.chiron ? { label: 'natal Chiron', sign: n.chiron.sign, degree: n.chiron.degree } : null;
              case 'lunarPg': return { label: 'natal Moon',    sign: n.moon.sign,    degree: n.moon.degree };
              default: return null;
            }
          })();
          return (
            <article key={c.key}>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block w-4 h-px" style={{ background: c.color }} />
                <h3 className="serif text-[19px] text-ink">{c.label}</h3>
                <span className="small-label caps text-ink-faint ml-1">
                  every {c.yearLength.toFixed(2)}y
                </span>
              </div>
              {natalAnchor && (
                <p className="small-label caps text-ink-faint mb-2" style={{ letterSpacing: '0.08em' }}>
                  {natalAnchor.label} · <span className="text-ink">{natalAnchor.sign} {natalAnchor.degree.toFixed(0)}°</span>
                </p>
              )}
              <dl className="space-y-3">
                <Lens k="Astrologically" v={lens.astrological} />
                <Lens k="Psychologically" v={lens.psychological} />
                <Lens k="In mundane life" v={lens.mundane} />
                <Lens k="As a story" v={lens.mythic} />
              </dl>
            </article>
          );
        })}
      </section>
    </main>
  );
}

function Lens({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="small-label caps text-ink-faint">{k}</dt>
      <dd className="serif text-[14px] text-ink-dim mt-0.5 leading-relaxed">{v}</dd>
    </div>
  );
}

