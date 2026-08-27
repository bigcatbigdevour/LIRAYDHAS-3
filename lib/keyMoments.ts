// Detect proximity to major life-cycle returns.

import { CYCLES, type Cycle } from './cycles';

const HIGH_DRAMA_KEYS = new Set(['saturn', 'chiron', 'nodal']);

export interface KeyMoment {
  cycle: Cycle;
  /** ageAtReturn - current age, signed. negative = just had one, positive = upcoming. */
  monthsAway: number;
  direction: 'approaching' | 'leaving';
}

export function imminentReturns(ageYears: number): KeyMoment[] {
  const out: KeyMoment[] = [];
  for (const c of CYCLES) {
    if (!HIGH_DRAMA_KEYS.has(c.key)) continue;
    const periodIdx = Math.round(ageYears / c.yearLength);
    const ageAt = periodIdx * c.yearLength;
    const yearsAway = ageAt - ageYears;
    const monthsAway = yearsAway * 12;
    // Within 6 months either direction = surfaceable.
    if (Math.abs(monthsAway) <= 6 && periodIdx > 0) {
      out.push({
        cycle: c,
        monthsAway,
        direction: monthsAway >= 0 ? 'approaching' : 'leaving',
      });
    }
  }
  return out;
}
