'use client';

import type { CyclePosition } from '@/lib/cycles';
import { CYCLES, ageInYears, positionInCycles } from '@/lib/cycles';

interface Props {
  birthIso: string;
  /** how many months ahead to forecast (default 12) */
  months?: number;
  /**
   * If set, each column becomes an in-page anchor link to
   * `#<anchorPrefix><year>-<monthIndex>`. The /year page uses this to
   * jump from the heatmap into the matching month's events list.
   */
  anchorPrefix?: string;
}

/**
 * A 7×N heatmap of the user's polarity across the next N months.
 * Each row is one cycle; each column is one month. Cell color is the
 * cycle's hue, opacity = brighter for rising / dimmer for descending.
 */
export default function PolarityForecast({ birthIso, months = 12, anchorPrefix }: Props) {
  // Guard the degenerate input early — otherwise the date-range caption at
  // the bottom would deref `cells[0]` and crash.
  if (months <= 0) return null;
  const now = new Date();
  const cells: { age: number; date: Date; positions: CyclePosition[]; key: string }[] = [];
  for (let m = 0; m < months; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() + m, 1);
    const ageAtM = ageInYears(birthIso, d);
    cells.push({
      age: ageAtM,
      date: d,
      positions: positionInCycles(ageAtM),
      key: `${d.getFullYear()}-${d.getMonth()}`,
    });
  }

  // For long ranges, only label every Nth column to avoid crowding.
  const labelStride = months <= 12 ? 1 : months <= 24 ? 2 : 6;
  const monthLabels = cells.map((c, i) => {
    if (i % labelStride !== 0) return '';
    // Show "M" for short ranges, "MYY" or "Y" for longer.
    if (months <= 12) return c.date.toLocaleString(undefined, { month: 'short' }).slice(0, 1);
    if (months <= 24) return c.date.toLocaleString(undefined, { month: 'short' }).slice(0, 1);
    return String(c.date.getFullYear()).slice(2);
  });

  return (
    <div>
      <div className="grid" style={{ gridTemplateColumns: `120px repeat(${months}, minmax(0, 1fr))` }}>
        {/* Header row: month initials (clickable when anchorPrefix is set) */}
        <div />
        {monthLabels.map((m, i) => {
          const long = cells[i].date.toLocaleString(undefined, { month: 'long', year: 'numeric' });
          if (anchorPrefix) {
            return (
              <a
                key={i}
                href={`#${anchorPrefix}${cells[i].key}`}
                className="text-center text-[10px] text-ink-faint hover:text-ink"
                style={{ letterSpacing: '0.06em' }}
                aria-label={`jump to ${long}`}
              >
                {m}
              </a>
            );
          }
          return (
            <div
              key={i}
              className="text-center text-[10px] text-ink-faint"
              style={{ letterSpacing: '0.06em' }}
            >
              {m}
            </div>
          );
        })}

        {/* One row per cycle */}
        {CYCLES.map((c, rowIdx) => {
          return (
            <div key={c.key} className="contents">
              <div className="flex items-center gap-1.5 text-[10.5px] text-ink-dim py-0.5">
                <span className="serif text-[12px] text-ink-dim" aria-hidden>{c.glyph}</span>
                <span className="inline-block w-2 h-px" style={{ background: c.color }} />
                <span>{c.label}</span>
              </div>
              {cells.map((cell, i) => {
                const p = cell.positions[rowIdx];
                const isRising = p.positive;
                const title = `${c.label} · ${cell.date.toLocaleString(undefined, { month: 'long', year: 'numeric' })} · ${isRising ? 'rising' : 'descending'} ${Math.round(p.fraction * 100)}%`;
                const style = {
                  background: c.color,
                  opacity: isRising ? 0.85 : 0.18,
                  height: 14,
                };
                if (anchorPrefix) {
                  return (
                    <a
                      key={i}
                      href={`#${anchorPrefix}${cell.key}`}
                      className="mx-px block"
                      style={style}
                      title={title}
                      aria-label={title}
                    />
                  );
                }
                return (
                  <div
                    key={i}
                    className="mx-px"
                    style={style}
                    title={title}
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

