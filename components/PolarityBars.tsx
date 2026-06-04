'use client';

import { useEffect, useState } from 'react';
import type { CyclePosition, PolarityFlip } from '@/lib/cycles';
import { POLARITY_HALVES } from '@/lib/polarityHalves';

interface Props {
  positions: CyclePosition[];
  flips?: PolarityFlip[];
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

export default function PolarityBars({ positions, flips }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandAll, setExpandAll] = useState(false);
  const [mounted, setMounted] = useState(false);
  const flipByKey: Record<string, PolarityFlip> = {};
  for (const f of flips ?? []) flipByKey[f.cycle.key] = f;

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  return (
    <>
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
      {positions.map((p, rowIdx) => {
        const isPos = p.positive;
        const pct = p.fraction * 100;
        const label = isPos ? 'rising' : 'descending';
        const isOpen = expandAll || expanded === p.cycle.key;
        const flip = flipByKey[p.cycle.key];
        const halfText = POLARITY_HALVES[p.cycle.key];
        const animDelayMs = rowIdx * 90;
        const fillWidth = mounted ? Math.min(100, pct) : 0;
        const markerLeft = mounted ? pct : 0;
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
              <div className="flex items-baseline justify-between mb-1">
                <span className="small-label caps flex items-center gap-1.5">
                  <span className="serif text-[13px] text-ink-dim" aria-hidden>{p.cycle.glyph}</span>
                  {p.cycle.label}
                  <span className="text-ink-faint">{isOpen ? '−' : '+'}</span>
                </span>
                <span className="text-[11px] text-ink-dim tabular-nums">
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
                    transition: `width 900ms cubic-bezier(.22,.61,.36,1) ${animDelayMs}ms`,
                  }}
                />
                <div
                  className="absolute top-0 bottom-0 w-px bg-ink polarity-marker-pulse"
                  style={{
                    left: `${markerLeft}%`,
                    transition: `left 900ms cubic-bezier(.22,.61,.36,1) ${animDelayMs}ms`,
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
