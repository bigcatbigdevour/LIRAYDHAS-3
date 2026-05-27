'use client';

import type { CyclePosition } from '@/lib/cycles';
import { CYCLES, ageInYears, positionInCycles } from '@/lib/cycles';

interface Props {
  birthIso: string;
  /** how many months ahead to forecast (default 12) */
  months?: number;
}

/**
 * A 7×N heatmap of the user's polarity across the next N months.
 * Each row is one cycle; each column is one month. Cell color is the
 * cycle's hue, opacity = brighter for rising / dimmer for descending.
 */
export default function PolarityForecast({ birthIso, months = 12 }: Props) {
  const now = new Date();
  const cells: { age: number; date: Date; positions: CyclePosition[] }[] = [];
  for (let m = 0; m < months; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() + m, 1);
    const ageAtM = ageInYears(birthIso, d);
    cells.push({ age: ageAtM, date: d, positions: positionInCycles(ageAtM) });
  }

  const monthLabels = cells.map((c) =>
    c.date.toLocaleString(undefined, { month: 'short' }).slice(0, 1),
  );

  return (
    <div>
      <div className="grid" style={{ gridTemplateColumns: `120px repeat(${months}, minmax(0, 1fr))` }}>
        {/* Header row: month initials */}
        <div />
        {monthLabels.map((m, i) => (
          <div
            key={i}
            className="text-center text-[10px] text-ink-faint"
            style={{ letterSpacing: '0.06em' }}
          >
            {m}
          </div>
        ))}

        {/* One row per cycle */}
        {CYCLES.map((c, rowIdx) => {
          return (
            <div key={c.key} className="contents">
              <div className="flex items-center gap-1.5 text-[10.5px] text-ink-dim py-0.5">
                <span className="inline-block w-2 h-px" style={{ background: c.color }} />
                <span>{c.label}</span>
              </div>
              {cells.map((cell, i) => {
                const p = cell.positions[rowIdx];
                const isRising = p.positive;
                return (
                  <div
                    key={i}
                    className="mx-px"
                    style={{
                      background: c.color,
                      opacity: isRising ? 0.85 : 0.18,
                      height: 14,
                    }}
                    title={`${c.label} · ${cell.date.toLocaleString(undefined, { month: 'long', year: 'numeric' })} · ${isRising ? 'rising' : 'descending'} ${Math.round(p.fraction * 100)}%`}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
      <p className="small-label caps text-ink-faint mt-2 text-center">
        {cells[0].date.toLocaleString(undefined, { month: 'short', year: '2-digit' })} →{' '}
        {cells[cells.length - 1].date.toLocaleString(undefined, { month: 'short', year: '2-digit' })}
      </p>
    </div>
  );
}
