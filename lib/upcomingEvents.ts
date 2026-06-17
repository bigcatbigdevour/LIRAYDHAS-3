// Compile a single chronological feed of upcoming cycle events:
//   - polarity flips
//   - cycle returns
//   - life stations (named convergences)
//
// Used by /polarity's "what's coming" section to give a unified
// timeline view instead of three separate lists.

import { CYCLES, polarityFlips, upcomingReturns, ageInYears, type Cycle } from './cycles';
import { LIFE_STATIONS, type LifeStation } from './lifeStations';

export type UpcomingEventKind = 'flip' | 'return' | 'station';

export interface UpcomingEvent {
  kind: UpcomingEventKind;
  date: Date;
  daysAhead: number;
  /** Tailwind-friendly hex for visual identity. */
  color: string;
  /** Display title, e.g. "Saturn return", "Mars synodic flips to descending" */
  title: string;
  /** Optional sub-line, e.g. "age 29.5 · first saturn return" */
  detail: string;
  /** Source cycle (if any). */
  cycle?: Cycle;
  /** Source station (if any). */
  station?: LifeStation;
}

export function upcomingEventsFeed(
  birthIso: string,
  now = new Date(),
  options: {
    horizonYears?: number;
    includeFlips?: boolean;
    includeReturns?: boolean;
    includeStations?: boolean;
  } = {},
): UpcomingEvent[] {
  const {
    horizonYears = 30,
    includeFlips = true,
    includeReturns = true,
    includeStations = true,
  } = options;

  const out: UpcomingEvent[] = [];
  const birth = new Date(birthIso);
  // Guard: a malformed birthIso produces NaN .getTime(), which makes
  // every comparison in the FLIPS loop false (NaN < x and NaN > x are
  // both false), so `break` never fires and we infinite-loop. Bail
  // early instead of locking the JS thread.
  if (Number.isNaN(birth.getTime())) return [];
  const horizon = now.getTime() + horizonYears * 365.2425 * 86400 * 1000;
  const currentAge = ageInYears(birthIso, now);

  // FLIPS — every half-period crossing inside the horizon
  if (includeFlips) {
    for (const c of CYCLES) {
      const halfLen = c.yearLength / 2;
      const halfDays = halfLen * 365.2425 * 86400 * 1000;
      for (let k = 1; ; k++) {
        const t = birth.getTime() + k * halfDays;
        if (t < now.getTime()) continue;
        if (t > horizon) break;
        const toRising = k % 2 === 0;
        const date = new Date(t);
        const daysAhead = (t - now.getTime()) / 86400_000;
        out.push({
          kind: 'flip',
          date,
          daysAhead,
          color: c.color,
          title: `${c.label} flips`,
          detail: `→ ${toRising ? 'rising' : 'descending'}`,
          cycle: c,
        });
      }
    }
  }

  // RETURNS — one per cycle, the next one only (using existing helper).
  if (includeReturns) {
    const returns = upcomingReturns(birthIso, now);
    for (const r of returns) {
      const daysAhead = (r.date.getTime() - now.getTime()) / 86400_000;
      if (daysAhead < 0 || daysAhead > horizonYears * 365.25) continue;
      out.push({
        kind: 'return',
        date: r.date,
        daysAhead,
        color: r.cycle.color,
        title: `${r.cycle.label}`,
        detail: `age ${r.ageAtReturn.toFixed(1)}`,
        cycle: r.cycle,
      });
    }
  }

  // STATIONS — future LifeStations
  if (includeStations) {
    for (const s of LIFE_STATIONS) {
      if (s.age <= currentAge) continue;
      const yearsAhead = s.age - currentAge;
      if (yearsAhead > horizonYears) continue;
      const date = new Date(now.getTime() + yearsAhead * 365.2425 * 86400 * 1000);
      out.push({
        kind: 'station',
        date,
        daysAhead: yearsAhead * 365.2425,
        color: '#8b3a3a',
        title: s.label,
        detail: `age ${s.age} · ${s.convergence}`,
        station: s,
      });
    }
  }

  out.sort((a, b) => a.date.getTime() - b.date.getTime());
  return out;
}

/** Use polarityFlips() as a faster alternative when only flips are needed. */
export function recentAndImminentFlips(birthIso: string, daysWindow = 30) {
  const flips = polarityFlips(birthIso);
  const recent = flips.filter((f) => f.daysSinceStart <= daysWindow);
  const imminent = flips.filter((f) => f.daysUntilEnd <= daysWindow);
  return { recent, imminent };
}
