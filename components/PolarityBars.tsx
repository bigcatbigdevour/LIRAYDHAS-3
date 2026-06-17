'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CyclePosition, PolarityFlip } from '@/lib/cycles';
import { polarityFlips, positionInCycles, ageInYears } from '@/lib/cycles';
import { POLARITY_HALVES } from '@/lib/polarityHalves';
import { CYCLE_PLAIN_LABELS } from '@/lib/cyclePlainLabels';
import { tap as hapticTap } from '@/lib/haptics';
import CycleGlyph from './CycleGlyph';

interface Props {
  positions: CyclePosition[];
  flips?: PolarityFlip[];
  /** Birth ISO — required for scrubbing (recomputes positions at a
   *  future/past date). Without it the component renders as before. */
  birthIso?: string;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function humanDays(d: number): string {
  const abs = Math.abs(d);
  if (abs < 1.5) return abs < 1 ? '<1 day' : '1 day';
  if (abs < 60) return `${Math.round(abs)} days`;
  if (abs < 365 * 1.5) return `${(abs / 30.44).toFixed(abs < 200 ? 1 : 0)} months`;
  return `${(abs / 365.25).toFixed(1)} years`;
}

export default function PolarityBars({ positions, flips, birthIso }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandAll, setExpandAll] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Scrub offset in days from now. 0 = today. Positive = future, negative
  // = past. Range chosen to cover the next full year of flips and the
  // last six months of context.
  const [scrubDays, setScrubDays] = useState(0);
  const isScrubbing = scrubDays !== 0;
  const SCRUB_MIN = -180;
  const SCRUB_MAX = 365;

  // Recompute positions + flips at the scrubbed date when birthIso is
  // provided. Falls back to the parent-provided positions when not.
  const scrubbedDate = useMemo(() => {
    if (!birthIso) return null;
    const d = new Date();
    d.setDate(d.getDate() + scrubDays);
    return d;
  }, [birthIso, scrubDays]);
  const scrubbedPositions = useMemo(() => {
    if (!birthIso || !scrubbedDate) return positions;
    return positionInCycles(ageInYears(birthIso, scrubbedDate));
  }, [birthIso, scrubbedDate, positions]);
  const scrubbedFlips = useMemo(() => {
    if (!birthIso || !scrubbedDate) return flips;
    return polarityFlips(birthIso, scrubbedDate);
  }, [birthIso, scrubbedDate, flips]);

  const renderPositions = isScrubbing && birthIso ? scrubbedPositions : positions;
  const renderFlips = isScrubbing && birthIso ? scrubbedFlips : flips;

  const flipByKey: Record<string, PolarityFlip> = {};
  for (const f of renderFlips ?? []) flipByKey[f.cycle.key] = f;

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  // Count flips that occur between now and the scrubbed date — surfaces
  // the structural shifts the user is dragging through.
  const flipsInWindow = useMemo(() => {
    if (!isScrubbing || !birthIso) return 0;
    const now = new Date();
    const baseFlips = polarityFlips(birthIso, now);
    let count = 0;
    for (const f of baseFlips) {
      const flipTimeMs = f.endsAt.getTime();
      const nowMs = now.getTime();
      const scrubbedMs = scrubbedDate?.getTime() ?? nowMs;
      // Count flips whose endsAt falls between min(now, scrubbed) and
      // max(now, scrubbed).
      const lo = Math.min(nowMs, scrubbedMs);
      const hi = Math.max(nowMs, scrubbedMs);
      if (flipTimeMs > lo && flipTimeMs <= hi) count++;
    }
    return count;
  }, [isScrubbing, birthIso, scrubbedDate]);

  return (
    <>
    {birthIso && (
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2 mb-1">
          <label
            className="small-label caps text-ink-faint text-[10px]"
            style={{ letterSpacing: '0.18em' }}
          >
            {isScrubbing
              ? scrubbedDate
                ? `${scrubDays > 0 ? '+' : ''}${scrubDays}d · ${formatDate(scrubbedDate)}`
                : 'scrubbing'
              : 'drag to see a future date'}
          </label>
          {isScrubbing && (
            <button
              type="button"
              onClick={() => { hapticTap('light'); setScrubDays(0); }}
              className="small-label caps text-ink-faint hover:text-ink text-[10px]"
              style={{ letterSpacing: '0.16em' }}
            >
              reset to today
            </button>
          )}
        </div>
        <input
          type="range"
          min={SCRUB_MIN}
          max={SCRUB_MAX}
          step={1}
          value={scrubDays}
          onChange={(e) => setScrubDays(parseInt(e.currentTarget.value, 10))}
          className="w-full age-scrubber"
          aria-label="scrub the polarity stack to a future or past date"
        />
        <div className="flex justify-between mt-1 text-[8px] text-ink-faint caps" style={{ letterSpacing: '0.12em' }}>
          <span>6m ago</span>
          <span>today</span>
          <span>6m</span>
          <span>1y</span>
        </div>
        {isScrubbing && flipsInWindow > 0 && (
          <p
            className="small-label caps text-accent text-[10px] mt-2"
            style={{ letterSpacing: '0.16em' }}
          >
            {flipsInWindow} polarity flip{flipsInWindow === 1 ? '' : 's'} in this window
          </p>
        )}
      </div>
    )}
    <div className="flex justify-end mb-2">
      <button
        type="button"
        onClick={() => {
          setExpandAll((v) => !v);
          setExpanded(null);
        }}
        className="small-label caps text-[10px] text-ink-faint hover:text-ink py-1 px-1"
        aria-pressed={expandAll}
        aria-label={expandAll ? 'collapse all cycle bars' : 'expand all cycle bars'}
      >
        {expandAll ? '✓ all expanded' : 'expand all'}
      </button>
    </div>
    <ul className="space-y-5">
      {renderPositions.map((p, rowIdx) => {
        const isPos = p.positive;
        const pct = p.fraction * 100;
        const label = isPos ? 'rising' : 'descending';
        const isOpen = expandAll || expanded === p.cycle.key;
        const flip = flipByKey[p.cycle.key];
        const halfText = POLARITY_HALVES[p.cycle.key];
        // While scrubbing, kill the staggered intro animation — bars
        // should snap to the scrubbed position instantly so the drag
        // feels live.
        const animDelayMs = isScrubbing ? 0 : rowIdx * 90;
        const transitionMs = isScrubbing ? 0 : 900;
        const fillWidth = (mounted || isScrubbing) ? Math.min(100, pct) : 0;
        const markerLeft = (mounted || isScrubbing) ? pct : 0;
        return (
          <li key={p.cycle.key} id={`bar-${p.cycle.key}`}>
            <button
              type="button"
              className="w-full text-left"
              onClick={() => {
                if (expandAll) {
                  // user wants to exit "all expanded" mode and focus on one
                  setExpandAll(false);
                  setExpanded(p.cycle.key);
                } else {
                  setExpanded(isOpen ? null : p.cycle.key);
                }
              }}
            >
              <div className="flex items-baseline justify-between mb-1 gap-2">
                <span className="small-label caps flex items-baseline gap-1.5">
                  <CycleGlyph cycleKey={p.cycle.key} size={13} className="text-ink-dim self-center" />
                  {p.cycle.label}
                  {CYCLE_PLAIN_LABELS[p.cycle.key] && (
                    <span className="serif italic text-[10.5px] text-ink-faint normal-case" style={{ letterSpacing: '0.02em' }}>
                      · {CYCLE_PLAIN_LABELS[p.cycle.key]}
                    </span>
                  )}
                  <span className="text-ink-faint">{isOpen ? '−' : '+'}</span>
                </span>
                <span className="text-[11px] text-ink-dim tabular-nums shrink-0">
                  {Math.round(pct)}% · {label}
                </span>
              </div>
              <div className="relative h-8 border border-hairline overflow-hidden">
                <div className="absolute left-0 right-0 top-1/2 h-px bg-hairline" />
                <div
                  className={`absolute polarity-fill-breathe ${isPos ? 'top-0' : 'bottom-0'}`}
                  style={{
                    left: 0,
                    width: `${fillWidth}%`,
                    height: '50%',
                    background: p.cycle.color,
                    transition: `width ${transitionMs}ms cubic-bezier(.22,.61,.36,1) ${animDelayMs}ms`,
                  }}
                />
                <div
                  className="absolute top-0 bottom-0 w-px bg-ink polarity-marker-pulse"
                  style={{
                    left: `${markerLeft}%`,
                    transition: `left ${transitionMs}ms cubic-bezier(.22,.61,.36,1) ${animDelayMs}ms`,
                  }}
                />
              </div>
              {flip && (
                <div className="mt-2 flex flex-wrap justify-between gap-x-2 text-[11.5px]" style={{ letterSpacing: '0.04em' }}>
                  <span className="text-ink-faint">
                    <span className="text-ink-dim">Day {Math.round(flip.daysSinceStart)}</span> of this {isPos ? 'rising' : 'descending'} half
                    <span className="opacity-60 text-[10px]"> · started {formatDate(flip.startedAt)}</span>
                  </span>
                  <span className="text-accent tabular-nums">
                    {Math.round(flip.daysUntilEnd)}d until flip
                  </span>
                </div>
              )}
            </button>
            {isOpen && (
              <div className="mt-2 space-y-2">
                <p className="text-[12.5px] text-ink-dim serif italic">
                  {p.cycle.description}
                </p>
                {halfText && (
                  <>
                    <p className="text-[13px] serif">
                      <span className="small-label caps text-ink-faint mr-1.5">
                        {isPos ? 'rising · now' : 'descending · now'}
                      </span>
                      <span className="text-ink">
                        {isPos ? halfText.rising : halfText.descending}
                      </span>
                    </p>
                    <p className="text-[13px] serif text-ink-dim">
                      <span className="small-label caps text-ink-faint mr-1.5">
                        {isPos ? 'next: descending' : 'next: rising'}
                      </span>
                      {isPos ? halfText.descending : halfText.rising}
                    </p>
                  </>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
    </>
  );
}
