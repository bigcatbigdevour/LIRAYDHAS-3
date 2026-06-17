'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import BodyGraph from '@/components/BodyGraph';
import NatalWheel from '@/components/NatalWheel';
import NatalAspects from '@/components/NatalAspects';
import SignGlyph from '@/components/SignGlyph';
import ActivationColumns from '@/components/ActivationColumns';
import {
  TYPE_DESCRIPTIONS,
  AUTHORITY_DESCRIPTIONS,
  profileName,
  profileDescription,
  crossName,
} from '@/lib/humandesign/interpretations';
import { lifePath, lifePathArchetype } from '@/lib/numerology';
import { houseOfLongitude } from '@/lib/astrology/houses';
import { SUN_BY_SIGN, MOON_BY_SIGN, RISING_BY_SIGN } from '@/lib/astrology/signMeanings';
import { gateName } from '@/lib/humandesign/gateNames';
import { ageInYears, positionInCycles } from '@/lib/cycles';
import { CYCLE_PLAIN_LABELS } from '@/lib/cyclePlainLabels';
import { currentChapter } from '@/lib/lifeChapters';
import { HOUSE_MEANINGS } from '@/lib/astrology/houseMeanings';
import { chartGlanceText } from '@/lib/chartGlance';
import PullToRefresh from '@/components/PullToRefresh';
import FirstTimeIntro from '@/components/FirstTimeIntro';
import { friendlyError } from '@/lib/friendlyError';
import { tap as hapticTap } from '@/lib/haptics';
import { api } from '@/lib/apiBase';
import { readSseStream, isEventStream } from '@/lib/streamRead';
import { useAbortableAction, isAbortError } from '@/lib/useAbortableAction';
import type { ZodiacSign } from '@/lib/types';

export default function ChartPage() {
  const router = useRouter();
  const blueprint = useStore((s) => s.blueprint);
  const narrative = useStore((s) => s.narrative);
  const setNarrative = useStore((s) => s.setNarrative);
  const reset = useStore((s) => s.reset);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [narrativeError, setNarrativeError] = useState<string | null>(null);
  const [streamNarrative, setStreamNarrative] = useState('');
  const startNarrativeFetch = useAbortableAction();

  useEffect(() => {
    const t = setTimeout(() => {
      if (!blueprint) router.replace('/onboarding');
    }, 60);
    return () => clearTimeout(t);
  }, [blueprint, router]);

  useEffect(() => {
    if (!blueprint || narrative) return;
    void fetchNarrative();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blueprint, narrative]);

  async function fetchNarrative() {
    if (!blueprint) return;
    const startBlueprint = blueprint;
    const { signal, stale } = startNarrativeFetch();
    setNarrativeLoading(true);
    setNarrativeError(null);
    setStreamNarrative('');
    try {
      const res = await fetch(api('/api/narrative?stream=1'), {
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
        if (stale() || useStore.getState().blueprint !== startBlueprint) return;
        setNarrative(await res.json());
        return;
      }
      let generatedAt = new Date().toISOString();
      let softError: string | null = null;
      await readSseStream(res, {
        meta: (m) => {
          if (typeof m.generatedAt === 'string') generatedAt = m.generatedAt;
        },
        paragraph: (_d, full) => { if (!stale()) setStreamNarrative(full); },
        done: ({ paragraph }) => {
          if (stale() || useStore.getState().blueprint !== startBlueprint) return;
          setNarrative({ paragraph, generatedAt });
          setStreamNarrative('');
        },
        error: (msg) => { softError = msg; },
      }, signal);
      if (!stale() && softError) {
        setStreamNarrative('');
        setNarrativeError(friendlyError(softError));
      }
    } catch (e: unknown) {
      if (isAbortError(e) || stale()) return;
      setNarrativeError(friendlyError(e instanceof Error ? e.message : null));
    } finally {
      if (!stale()) setNarrativeLoading(false);
    }
  }

  if (!blueprint) return null;
  const hd = blueprint.humanDesign;
  const n = blueprint.natal;

  // Parse cross gates from the "p1/p2 | d1/d2" string built in derive.ts
  let crossLabel = hd.incarnationCross;
  const m = hd.incarnationCross.match(/^(\d+)\/(\d+)\s*\|\s*(\d+)\/(\d+)$/);
  if (m) {
    const named = crossName(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]));
    if (named) crossLabel = `${named} (${hd.incarnationCross})`;
  }

  function toggle(key: string) {
    setExpanded((cur) => (cur === key ? null : key));
  }

  return (
    <PullToRefresh onRefresh={fetchNarrative}>
    <main className="page max-w-md mx-auto fade-in">
      <header className="pb-6">
        <p className="small-label caps">Your design</p>
        <h1 className="h-display serif mt-3">
          {hd.type}.
        </h1>
        <p
          className="small-label caps text-ink-faint mt-2 text-[10.5px]"
          style={{ letterSpacing: '0.18em' }}
        >
          {hd.profile} · {profileName(hd.profile)}
        </p>
        <p className="text-ink-dim text-[13px] mt-3 italic leading-relaxed">
          Born {new Date(blueprint.birth.iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: blueprint.birth.timeUnknown ? undefined : 'short' })}
          <br className="sm:hidden" />
          {' · '}{blueprint.birth.place}
          {' '}
          <Link href="/onboarding?edit=1" className="not-italic small-label caps text-ink-faint hover:text-accent ml-1" style={{ letterSpacing: '0.16em' }}>
            edit
          </Link>
        </p>
        {blueprint.birth.timeUnknown && (
          <p className="text-accent text-[11px] mt-2 caps" style={{ letterSpacing: '0.18em' }}>
            Birth time unknown — profile and houses are soft
          </p>
        )}
        <FirstTimeIntro storeKey="liraydhas.chart.intro.dismissed.v1" learnHref="/learn#chart">
          <p>
            The chart below has nine{' '}
            <span className="text-ink">centers</span> (the geometric
            shapes), sixty-four <span className="text-ink">gates</span>{' '}
            (the numbered circles attached to each center), and
            thirty-six <span className="text-ink">channels</span> (the
            lines that connect gates). When both gates of a channel are
            active, the channel fills in solid and the two centers it
            connects become <span className="text-ink">defined</span>.
            Defined centers broadcast their energy consistently. Open
            centers absorb and amplify from whoever you're around.
          </p>
          <p>
            <span className="text-ink">Cream</span> markers come from
            the sky at the exact moment of your birth — the conscious
            side. <span className="text-accent">Wine</span> markers come
            from the sky at the moment the Sun was eighty-eight degrees
            of arc earlier — the unconscious side. Tap any gate, channel,
            or center for a plain reading of what it does.
          </p>
        </FirstTimeIntro>
      </header>

      <section className="my-6">
        <BodyGraph blueprint={blueprint} />
        <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1.5 mt-3 text-[10px] caps" style={{ letterSpacing: '0.14em' }}>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-px bg-ink" />
            defined
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-px bg-hairline" />
            undefined
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-ink" />
            personality
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: '#b22a2a' }} />
            design
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ background: 'linear-gradient(90deg, #b22a2a 50%, #f4f1ea 50%)' }}
            />
            both
          </span>
        </div>
        <p className="small-label caps text-ink-faint text-center mt-2" style={{ letterSpacing: '0.18em' }}>
          tap any gate · channel · or center
        </p>
      </section>

      <section className="mt-4 mb-10">
        {narrativeLoading && !narrative && !streamNarrative && (
          <div>
            <p className="small-label caps text-ink-faint mb-3" style={{ letterSpacing: '0.18em' }}>
              composing your chart reading
            </p>
            <div className="space-y-2 animate-pulse">
              <div className="h-4 bg-hairline w-11/12" />
              <div className="h-4 bg-hairline w-10/12" />
              <div className="h-4 bg-hairline w-9/12" />
              <div className="h-4 bg-hairline w-8/12" />
            </div>
          </div>
        )}
        {narrativeError && (
          <div>
            <p className="text-accent text-[12px]">{narrativeError}</p>
            <button className="btn-ghost mt-1" onClick={() => { hapticTap('light'); void fetchNarrative(); }}>try again</button>
          </div>
        )}
        {(narrative?.paragraph || streamNarrative) && (
          <p className="body-prose serif text-ink">
            {narrative?.paragraph || streamNarrative}
            {streamNarrative && !narrative?.paragraph && (
              <span className="stream-cursor" aria-hidden>▎</span>
            )}
          </p>
        )}
      </section>

      <section className="mt-2 mb-8">
        <p className="small-label caps mb-2">activations</p>
        <ActivationColumns blueprint={blueprint} />
      </section>

      {/* Deterministic glance summary — always present, copy-friendly.
          Display uses serif body styling for legibility; the share
          handler still emits plain text via chartGlanceText so what
          the user copies is unstyled and pasteable anywhere. */}
      <section className="mt-2 mb-8">
        <div className="flex items-baseline justify-between mb-2">
          <p className="small-label caps">at a glance</p>
          <button
            type="button"
            className="small-label caps text-[10px] text-ink-faint hover:text-ink"
            onClick={async () => {
              const txt = chartGlanceText(blueprint);
              try {
                if (navigator.share) {
                  await navigator.share({ title: 'My chart', text: txt });
                } else {
                  await navigator.clipboard.writeText(txt);
                  const el = document.getElementById('chart-glance-toast');
                  if (el) { el.style.opacity = '1'; window.setTimeout(() => { el.style.opacity = '0'; }, 1500); }
                }
              } catch {/* cancelled */}
            }}
          >
            share
          </button>
        </div>
        <ul className="space-y-1.5 text-[13px] text-ink-dim serif leading-relaxed">
          {chartGlanceText(blueprint).split('\n').map((line, i) => (
            <li key={i} className="border-l-2 border-hairline pl-3">{line}</li>
          ))}
        </ul>
        <div id="chart-glance-toast" className="small-label caps text-accent text-right" style={{ opacity: 0, transition: 'opacity 300ms ease', height: '1em' }}>copied</div>
      </section>

      {(() => {
        const counts = new Map<number, number>();
        for (const g of hd.activeGates) counts.set(g.gate, (counts.get(g.gate) ?? 0) + 1);
        const strongest = [...counts.entries()]
          .filter(([, n]) => n >= 2)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
        if (strongest.length === 0) return null;
        return (
          <section className="mt-6 mb-8">
            <p className="small-label caps mb-2">most-activated gates</p>
            <ul className="space-y-1 text-[13px]">
              {strongest.map(([gate, count]) => (
                <li key={gate} className="flex justify-between border-b border-hairline py-1">
                  <span className="text-ink-dim">
                    <span className="text-ink tabular-nums mr-2">{gate}</span>
                    {gateName(gate)}
                  </span>
                  <span className="text-ink-faint">×{count}</span>
                </li>
              ))}
            </ul>
          </section>
        );
      })()}

      <dl className="mt-8 border-t border-hairline text-[13px]">
        <ExpandRow
          k="Type" v={hd.type}
          expanded={expanded === 'type'} onClick={() => toggle('type')}
          detail={`${hd.strategy}. ${TYPE_DESCRIPTIONS[hd.type]}`}
        />
        <ExpandRow
          k="Authority" v={hd.authority}
          expanded={expanded === 'authority'} onClick={() => toggle('authority')}
          detail={AUTHORITY_DESCRIPTIONS[hd.authority]}
        />
        <ExpandRow
          k="Profile" v={`${hd.profile} · ${profileName(hd.profile)}`}
          expanded={expanded === 'profile'} onClick={() => toggle('profile')}
          detail={profileDescription(hd.profile)}
        />
        <Row k="Strategy"    v={hd.strategy} />
        <Row k="Definition"  v={hd.definition} />
        {hd.splits.length > 1 && (
          <Row
            k="Splits"
            small
            v={hd.splits
              .map((g, i) => `[${i + 1}] ${g.map(humanize).join(' + ')}`)
              .join(' · ')}
          />
        )}
        <Row k="Cross"       v={crossLabel} small />
        <Row k="Defined centers" v={hd.definedCenters.length > 0 ? hd.definedCenters.map(humanize).join(', ') : 'none'} small />
        <Row k="Channels" v={hd.activeChannels.length === 0 ? 'none' : hd.activeChannels.map(([a, b]) => `${a}-${b}`).join(' · ')} small />
      </dl>

      <section className="mt-12 border-t border-hairline pt-6">
        <p className="small-label caps mb-3">natal sky</p>

        {/* Headline trio — Sun · Moon · Rising. The three pieces every
            astrology-literate reader looks for first, surfaced as large
            glyphs so the page has an instant focal point above the
            denser wheel + placement grid below. */}
        <div className="flex items-stretch justify-between gap-2 border border-hairline divide-x divide-hairline mb-6">
          <SignHeadline label="Sun"  sign={n.sun.sign} />
          <SignHeadline label="Moon" sign={n.moon.sign} />
          <SignHeadline
            label="Rising"
            sign={n.asc !== null ? signFromLon(n.asc) : null}
          />
        </div>

        <NatalWheel blueprint={blueprint} />

        <div className="mt-6 space-y-3 text-[13.5px] text-ink-dim">
          <SignLine label="Sun" sign={n.sun.sign} meaning={SUN_BY_SIGN[n.sun.sign as ZodiacSign]} />
          <SignLine label="Moon" sign={n.moon.sign} meaning={MOON_BY_SIGN[n.moon.sign as ZodiacSign]} />
          {n.asc !== null && (
            <SignLine
              label="Rising"
              sign={signFromLon(n.asc)}
              meaning={RISING_BY_SIGN[signFromLon(n.asc) as ZodiacSign]}
            />
          )}
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-y-1 text-[13px] text-ink-dim">
          <Placement label="Sun" pos={n.sun} house={houseOfLongitude(n.sun.longitude, n.houses)} />
          <Placement label="Moon" pos={n.moon} house={houseOfLongitude(n.moon.longitude, n.houses)} />
          <Placement label="Mercury" pos={n.mercury} house={houseOfLongitude(n.mercury.longitude, n.houses)} />
          <Placement label="Venus" pos={n.venus} house={houseOfLongitude(n.venus.longitude, n.houses)} />
          <Placement label="Mars" pos={n.mars} house={houseOfLongitude(n.mars.longitude, n.houses)} />
          <Placement label="Jupiter" pos={n.jupiter} house={houseOfLongitude(n.jupiter.longitude, n.houses)} />
          <Placement label="Saturn" pos={n.saturn} house={houseOfLongitude(n.saturn.longitude, n.houses)} />
          {n.asc !== null && (
            <li className="flex justify-between border-b border-hairline py-1">
              <span className="text-ink">Rising</span>
              <span className="tabular-nums flex items-center gap-1">
                <SignGlyph sign={signFromLon(n.asc)} size={12} className="text-ink-dim" />
                <span>{signFromLon(n.asc)} {(n.asc % 30).toFixed(1)}°</span>
              </span>
            </li>
          )}
        </ul>

        {/* Houses — tap-to-expand meaning */}
        {n.houses[0] !== null && (
          <details className="mt-6 group">
            <summary className="small-label caps cursor-pointer text-ink-dim hover:text-ink list-none flex items-center gap-2">
              <span>The twelve houses</span>
              <span className="text-ink-faint group-open:rotate-90 transition-transform">›</span>
            </summary>
            <ul className="space-y-2 mt-3 text-[12.5px]">
              {([1,2,3,4,5,6,7,8,9,10,11,12] as const).map((h) => {
                const cusp = n.houses[h - 1];
                if (cusp === null) return null;
                const meaning = HOUSE_MEANINGS[h];
                return (
                  <li key={h} className="border-b border-hairline pb-1.5">
                    <div className="flex justify-between items-baseline">
                      <span className="text-ink">H{h} · {meaning.name}</span>
                      <span className="tabular-nums text-ink-faint flex items-center gap-1">
                        <SignGlyph sign={signFromLon(cusp)} size={11} className="text-ink-faint" />
                        <span>{signFromLon(cusp)} {(cusp % 30).toFixed(1)}°</span>
                      </span>
                    </div>
                    <p className="serif text-ink-dim mt-0.5 leading-relaxed">{meaning.meaning}</p>
                  </li>
                );
              })}
            </ul>
          </details>
        )}

        <NatalAspects blueprint={blueprint} />
      </section>

      <section className="mt-12 border-t border-hairline pt-6">
        <p className="small-label caps mb-2">numerology</p>
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] text-ink-dim">Life path</span>
          <span className="text-[24px] serif">{lifePath(blueprint.birth.iso)}</span>
        </div>
        <p className="text-[12.5px] text-ink-dim mt-1 italic">
          {lifePathArchetype(lifePath(blueprint.birth.iso))}
        </p>
      </section>

      {/* Live cycle status at the bottom of the natal chart */}
      <section className="mt-12 border-t border-hairline pt-6">
        {(() => {
          const ch = currentChapter(ageInYears(blueprint.birth.iso));
          if (!ch) return null;
          return (
            <p className="small-label caps text-ink-faint mb-3">
              you are in · <span className="text-ink">{ch.label.toLowerCase()}</span>
              <span className="ml-2 text-[10px]">ages {ch.startAge}–{ch.endAge}</span>
            </p>
          );
        })()}
        <div className="flex items-baseline justify-between mb-2">
          <p className="small-label caps">your cycles right now</p>
          <Link href="/polarity" className="small-label caps text-ink-faint hover:text-ink">
            full stack →
          </Link>
        </div>
        <ul className="space-y-0.5 text-[12.5px]">
          {positionInCycles(ageInYears(blueprint.birth.iso)).map((p) => (
            <li key={p.cycle.key} className="flex justify-between items-baseline gap-2 border-b border-hairline py-1">
              <span className="text-ink-dim flex items-baseline gap-1.5 min-w-0">
                <span className="serif text-[12px] text-ink-dim" aria-hidden>{p.cycle.glyph}</span>
                <span className="inline-block w-2 h-px self-center" style={{ background: p.cycle.color }} />
                <span className="text-ink">{p.cycle.label}</span>
                {CYCLE_PLAIN_LABELS[p.cycle.key] && (
                  <span className="serif italic text-[10px] text-ink-faint truncate">· {CYCLE_PLAIN_LABELS[p.cycle.key]}</span>
                )}
              </span>
              <span className="tabular-nums text-ink-faint shrink-0">
                {p.positive ? '↑ rising' : '↓ descending'} · {Math.round(p.fraction * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 space-y-2">
        <Link href="/compat" className="btn-ghost block">compatibility with someone else →</Link>
        <Link href="/about" className="btn-ghost block">about this app →</Link>
        <button
          className="btn-ghost"
          onClick={() => {
            if (confirm('Erase your blueprint and start over?')) {
              reset();
              router.replace('/onboarding');
            }
          }}
        >
          erase and start over
        </button>
      </section>
    </main>
    </PullToRefresh>
  );
}

function Row({ k, v, small }: { k: string; v: string; small?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-4 py-2 border-b border-hairline">
      <dt className="small-label caps">{k}</dt>
      <dd className={`text-right ${small ? 'text-[12px]' : ''}`}>{v}</dd>
    </div>
  );
}

function ExpandRow({
  k, v, detail, expanded, onClick,
}: {
  k: string; v: string; detail: string; expanded: boolean; onClick: () => void;
}) {
  return (
    <div className="border-b border-hairline">
      <button
        onClick={onClick}
        className="w-full grid grid-cols-2 gap-4 py-2 text-left"
      >
        <dt className="small-label caps flex items-center gap-1.5">
          <span>{k}</span>
          <span className="text-ink-faint">{expanded ? '−' : '+'}</span>
        </dt>
        <dd className="text-right">{v}</dd>
      </button>
      {expanded && (
        <p className="pb-3 text-[13px] text-ink-dim serif leading-relaxed">{detail}</p>
      )}
    </div>
  );
}

/**
 * Three-up headline at the top of the natal sky section. Big glyph as
 * the visual anchor, label above, sign name below. Each tile is equal
 * width via flex-1, divided by hairlines that subtly group them as
 * one composition without boxing them in.
 *
 * When rising sign isn't known (time-unknown birth), the third tile
 * renders a faint em-dash where the glyph would be — keeps the visual
 * rhythm of three but doesn't fake an answer.
 */
function SignHeadline({ label, sign }: { label: string; sign: string | null }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-4 px-2">
      <p
        className="small-label caps text-ink-faint text-[9px] mb-2"
        style={{ letterSpacing: '0.22em' }}
      >
        {label}
      </p>
      {sign ? (
        <>
          <SignGlyph sign={sign} size={28} className="text-ink mb-1.5" strokeWidth={1.3} />
          <p className="serif text-[12px] text-ink-dim lowercase tracking-wide">
            {sign.toLowerCase()}
          </p>
        </>
      ) : (
        <>
          <span className="text-ink-faint text-[28px] leading-none" aria-hidden>—</span>
          <p className="serif text-[10.5px] text-ink-faint italic mt-1.5 text-center leading-tight">
            time<br/>unknown
          </p>
        </>
      )}
    </div>
  );
}

function SignLine({ label, sign, meaning }: { label: string; sign: string; meaning: string }) {
  return (
    <div>
      <p className="small-label caps flex items-center gap-1.5">
        <span>{label} in</span>
        <SignGlyph sign={sign} size={13} className="text-ink-dim" />
        <span>{sign}</span>
      </p>
      <p className="serif italic mt-0.5">{meaning}</p>
    </div>
  );
}

function Placement({
  label,
  pos,
  house,
}: {
  label: string;
  pos: { sign: string; degree: number; gate: number; line: number };
  house?: number | null;
}) {
  return (
    <li className="flex justify-between items-center border-b border-hairline py-2 gap-2">
      <span className="text-ink text-[13px]">{label}</span>
      <span className="tabular-nums flex items-center gap-1.5 text-[12px]">
        <SignGlyph sign={pos.sign} size={13} className="text-ink-dim" />
        <span className="text-ink-dim">{pos.degree.toFixed(1)}°</span>
        {house ? <span className="text-ink-faint">· H{house}</span> : null}
        <span className="text-ink-faint">· {pos.gate}.{pos.line}</span>
      </span>
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
function humanize(s: string): string {
  return s === 'SolarPlexus' ? 'Solar Plexus' : s;
}
