'use client';

import type { CyclePosition } from '@/lib/cycles';

export default function PolarityBars({ positions }: { positions: CyclePosition[] }) {
  return (
    <ul className="space-y-5">
      {positions.map((p) => {
        const isPos = p.positive;
        const pct = p.fraction * 100;
        const label = isPos ? 'rising' : 'descending';
        return (
          <li key={p.cycle.key}>
            <div className="flex items-baseline justify-between mb-1">
              <span className="small-label caps">{p.cycle.label}</span>
              <span className="text-[11px] text-ink-dim tabular-nums">
                {Math.round(pct)}% · {label}
              </span>
            </div>
            <div className="relative h-8 border border-hairline">
              {/* mid-axis */}
              <div className="absolute left-0 right-0 top-1/2 h-px bg-hairline" />
              {/* progress half */}
              <div
                className={`absolute ${isPos ? 'top-0' : 'bottom-0'}`}
                style={{
                  left: 0,
                  width: `${Math.min(100, pct)}%`,
                  height: '50%',
                  background: p.cycle.color,
                  opacity: 0.6,
                }}
              />
              {/* marker */}
              <div
                className="absolute top-0 bottom-0 w-px bg-ink"
                style={{ left: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
