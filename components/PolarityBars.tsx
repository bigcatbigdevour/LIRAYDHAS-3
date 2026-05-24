'use client';

import { useState } from 'react';
import type { CyclePosition } from '@/lib/cycles';

export default function PolarityBars({ positions }: { positions: CyclePosition[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <ul className="space-y-5">
      {positions.map((p) => {
        const isPos = p.positive;
        const pct = p.fraction * 100;
        const label = isPos ? 'rising' : 'descending';
        const isOpen = expanded === p.cycle.key;
        return (
          <li key={p.cycle.key}>
            <button
              className="w-full text-left"
              onClick={() => setExpanded(isOpen ? null : p.cycle.key)}
            >
              <div className="flex items-baseline justify-between mb-1">
                <span className="small-label caps flex items-center gap-1.5">
                  {p.cycle.label}
                  <span className="text-ink-faint">{isOpen ? '−' : '+'}</span>
                </span>
                <span className="text-[11px] text-ink-dim tabular-nums">
                  {Math.round(pct)}% · {label}
                </span>
              </div>
              <div className="relative h-8 border border-hairline">
                <div className="absolute left-0 right-0 top-1/2 h-px bg-hairline" />
                <div
                  className={`absolute ${isPos ? 'top-0' : 'bottom-0'}`}
                  style={{
                    left: 0,
                    width: `${Math.min(100, pct)}%`,
                    height: '50%',
                    background: p.cycle.color,
                    opacity: 0.65,
                  }}
                />
                <div
                  className="absolute top-0 bottom-0 w-px bg-ink"
                  style={{ left: `${pct}%` }}
                />
              </div>
            </button>
            {isOpen && (
              <p className="text-[12.5px] text-ink-dim mt-2 serif italic">
                {p.cycle.description}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
