// Defines the major life cycles used by the Arcs and Polarity tabs.

export interface Cycle {
  key: string;
  label: string;
  /** length in years */
  yearLength: number;
  /** Tailwind / hex color for the arcs view */
  color: string;
  /** What the rising vs descending arc tends to mean. */
  description: string;
}

export const CYCLES: Cycle[] = [
  { key: 'solar',    label: 'Solar return',      yearLength: 1.000,  color: '#c2bea3',
    description: 'Annual reset. Rising = first six months after birthday, gathering. Descending = back half, releasing.' },
  { key: 'mars',     label: 'Mars synodic',      yearLength: 2.135,  color: '#8b3a3a',
    description: 'Action and friction. Rising = energy organising into a project. Descending = closing out the fight.' },
  { key: 'jupiter',  label: 'Jupiter return',    yearLength: 11.862, color: '#9c8a3a',
    description: 'Expansion and luck. Rising = doors opening. Descending = harvesting the season.' },
  { key: 'saturn',   label: 'Saturn return',     yearLength: 29.457, color: '#6e553a',
    description: 'Structure and consequence. Rising = building. Descending = pruning what won\'t hold.' },
  { key: 'nodal',    label: 'Nodal return',      yearLength: 18.613, color: '#3a7a52',
    description: 'Direction. Rising = pulled forward by purpose. Descending = settling into what was learned.' },
  { key: 'chiron',   label: 'Chiron return',     yearLength: 50.42,  color: '#5a5a7a',
    description: 'The wound and the teacher. Rising = excavation. Descending = integration.' },
  { key: 'lunarPg',  label: 'Progressed lunar',  yearLength: 27.32 / 12, color: '#7a3a7a',
    description: 'Emotional weather, slowed down. Rising = a mood building. Descending = letting it pass.' },
];

export function ageInYears(birthIso: string, now = new Date()): number {
  const b = new Date(birthIso);
  return (now.getTime() - b.getTime()) / (365.2425 * 86400 * 1000);
}

export interface CyclePosition {
  cycle: Cycle;
  periodIndex: number;     // which numbered period the person is in
  fraction: number;        // 0..1 progress within the current period
  /** True if in the first half (rising / positive). */
  positive: boolean;
}

export function positionInCycles(age: number): CyclePosition[] {
  return CYCLES.map((c) => {
    const idx = Math.floor(age / c.yearLength);
    const frac = (age - idx * c.yearLength) / c.yearLength;
    return {
      cycle: c,
      periodIndex: idx,
      fraction: frac,
      positive: frac < 0.5,
    };
  });
}

export interface UpcomingReturn {
  cycle: Cycle;
  ageAtReturn: number;
  date: Date;
}

/** Next return date for every cycle, given the user's birth ISO. */
export function upcomingReturns(birthIso: string, now = new Date()): UpcomingReturn[] {
  const birth = new Date(birthIso);
  const age = (now.getTime() - birth.getTime()) / (365.2425 * 86400 * 1000);
  return CYCLES.map((c) => {
    const nextN = Math.ceil(age / c.yearLength);
    const ageAt = nextN * c.yearLength;
    const date = new Date(birth.getTime() + ageAt * 365.2425 * 86400 * 1000);
    return { cycle: c, ageAtReturn: ageAt, date };
  }).sort((a, b) => a.date.getTime() - b.date.getTime());
}

export interface PolarityFlip {
  cycle: Cycle;
  /** True if currently in the rising half of its period. */
  positive: boolean;
  /** Date when current half started (a flip or a return). */
  startedAt: Date;
  /** Date when current half ends (next flip). */
  endsAt: Date;
  /** Days since the current half started. */
  daysSinceStart: number;
  /** Days until the current half ends. */
  daysUntilEnd: number;
}

/**
 * For each cycle, compute when the current rising/descending phase began
 * and when it will end. A phase is half a period — the first half is
 * rising, the second half is descending.
 */
export function polarityFlips(birthIso: string, now = new Date()): PolarityFlip[] {
  const birth = new Date(birthIso);
  const age = ageInYears(birthIso, now);
  return CYCLES.map((c) => {
    // Halves are every (yearLength / 2). The k-th half starts at age k*L/2.
    const halfLen = c.yearLength / 2;
    const halfIdx = Math.floor(age / halfLen);
    const positive = halfIdx % 2 === 0;
    const startAge = halfIdx * halfLen;
    const endAge = (halfIdx + 1) * halfLen;
    const startedAt = new Date(birth.getTime() + startAge * 365.2425 * 86400 * 1000);
    const endsAt = new Date(birth.getTime() + endAge * 365.2425 * 86400 * 1000);
    const daysSinceStart = (now.getTime() - startedAt.getTime()) / 86400_000;
    const daysUntilEnd = (endsAt.getTime() - now.getTime()) / 86400_000;
    return { cycle: c, positive, startedAt, endsAt, daysSinceStart, daysUntilEnd };
  });
}
