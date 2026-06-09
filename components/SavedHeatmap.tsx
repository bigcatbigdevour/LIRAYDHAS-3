'use client';

import { useMemo, useState } from 'react';
import type { SavedDay } from '@/lib/savedDays';
import { localDateStr } from '@/lib/localDate';

interface Props {
  days: SavedDay[];
  /** ISO date of "today" — for the highlight marker. */
  todayIso: string;
}

/**
 * A 53-week × 7-day grid covering today + the prior ~12 months.
 * Each cell is one day. Faint when no save, accent-filled when a save
 * exists, slightly brighter when the save also has a note. Tapping a
 * cell jumps to that day's section on /saved (#m-YYYY-MM).
 *
 * Renders nothing until the user has at least a few entries — an empty
 * heatmap on day-one is just clutter and discouragement.
 */
export default function SavedHeatmap({ days, todayIso }: Props) {
  const [hover, setHover] = useState<{ iso: string; day?: SavedDay } | null>(null);

  const cells = useMemo(() => {
    const map = new Map<string, SavedDay>();
    for (const d of days) map.set(d.dateIso, d);

    const today = new Date(todayIso + 'T12:00:00');
    // Walk back so the LAST column is the week-of-today.
    // Total cells = 53 weeks × 7 days. Anchor the bottom-right cell
    // at today, then fill the grid backward.
    const totalDays = 53 * 7;
    const out: { iso: string; day?: SavedDay; isToday: boolean; isFuture: boolean }[] = [];
    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = localDateStr(d);
      out.push({
        iso,
        day: map.get(iso),
        isToday: iso === todayIso,
        isFuture: false,
      });
    }
    return out;
  }, [days, todayIso]);

  // Month labels: position above the first week of each month within the
  // grid so the reader can place "march" / "april" / "may" along the top.
  const monthLabels = useMemo(() => {
    const labels: { x: number; label: string }[] = [];
    let seenMonth = -1;
    for (let week = 0; week < 53; week++) {
      const firstCell = cells[week * 7];
      if (!firstCell) continue;
      const m = new Date(firstCell.iso + 'T12:00:00').getMonth();
      if (m !== seenMonth) {
        seenMonth = m;
        labels.push({
          x: week,
          label: new Date(firstCell.iso + 'T12:00:00').toLocaleString(undefined, { month: 'short' }).toLowerCase(),
        });
      }
    }
    return labels;
  }, [cells]);

  if (days.length < 5) return null;

  const cellSize = 8;
  const gap = 2;
  const W = 53 * (cellSize + gap);
  const H = 7 * (cellSize + gap) + 18; // +18 for month labels above

  return (
    <section className="mb-8">
      <p
        className="small-label caps text-ink-faint mb-2"
        style={{ letterSpacing: '0.18em' }}
      >
        the past year · your marks
      </p>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ maxWidth: 600 }}
          role="img"
          aria-label="memory grid: every day in the past year, marked if you saved a reading or wrote an entry"
        >
          {monthLabels.map((m) => (
            <text
              key={`${m.x}-${m.label}`}
              x={m.x * (cellSize + gap)}
              y={10}
              fontSize={8}
              fill="#666"
              style={{ letterSpacing: '0.08em' }}
            >
              {m.label}
            </text>
          ))}
          {cells.map((c, i) => {
            const week = Math.floor(i / 7);
            const day = i % 7;
            const x = week * (cellSize + gap);
            const y = 18 + day * (cellSize + gap);
            const hasNote = c.day?.note && c.day.note.trim().length > 0;
            const hasParagraph = c.day?.paragraph && c.day.paragraph.length > 0;
            const fill = c.day
              ? hasNote
                ? '#b22a2a' // wine accent — strongest signal
                : hasParagraph
                  ? '#8b3a3a55' // faint accent for paragraph-only
                  : '#8b3a3a99'
              : '#2a2a2a';
            const stroke = c.isToday ? '#f4f1ea' : 'none';
            // Build a screen-reader-friendly label that distinguishes
            // noted-vs-paragraph-only vs not-saved.
            const status = !c.day
              ? 'no entry'
              : hasNote
                ? 'saved with note'
                : hasParagraph
                  ? 'saved'
                  : 'journal entry';
            return (
              <a
                key={c.iso}
                // Anchor only when there's an entry to jump to — empty
                // cells aren't keyboard-focusable, which is correct.
                href={c.day ? `#d-${c.iso}` : undefined}
                onMouseEnter={() => setHover({ iso: c.iso, day: c.day })}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover({ iso: c.iso, day: c.day })}
                onBlur={() => setHover(null)}
                aria-label={`${c.iso} · ${status}${c.isToday ? ' · today' : ''}`}
              >
                <rect
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={c.isToday ? 0.8 : 0}
                />
              </a>
            );
          })}
        </svg>
        {hover && (
          <div
            className="pointer-events-none absolute top-0 right-0 text-[10px] caps text-ink-dim bg-bg border border-hairline px-2 py-1"
            style={{ letterSpacing: '0.14em' }}
          >
            {new Date(hover.iso + 'T12:00:00').toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }).toLowerCase()}
            {hover.day ? ' · saved' : ''}
          </div>
        )}
      </div>
      <p
        className="small-label caps text-ink-faint mt-2 text-[10px] flex items-center gap-3"
        style={{ letterSpacing: '0.14em' }}
      >
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2" style={{ background: '#b22a2a' }} />
          with a note
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2" style={{ background: '#8b3a3a99' }} />
          saved
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2" style={{ background: '#2a2a2a' }} />
          quiet
        </span>
      </p>
    </section>
  );
}
