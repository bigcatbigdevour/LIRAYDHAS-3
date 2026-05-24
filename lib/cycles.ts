// Defines the major life cycles used by the Arcs and Polarity tabs.

export interface Cycle {
  key: string;
  label: string;
  /** length in years */
  yearLength: number;
  /** Tailwind / hex color for the arcs view */
  color: string;
}

export const CYCLES: Cycle[] = [
  { key: 'solar',    label: 'Solar return',      yearLength: 1.000,  color: '#c2bea3' },
  { key: 'mars',     label: 'Mars synodic',      yearLength: 2.135,  color: '#8b3a3a' },
  { key: 'jupiter',  label: 'Jupiter return',    yearLength: 11.862, color: '#9c8a3a' },
  { key: 'saturn',   label: 'Saturn return',     yearLength: 29.457, color: '#6e553a' },
  { key: 'nodal',    label: 'Nodal return',      yearLength: 18.613, color: '#3a7a52' },
  { key: 'chiron',   label: 'Chiron return',     yearLength: 50.42,  color: '#5a5a7a' },
  { key: 'lunarPg',  label: 'Progressed lunar',  yearLength: 27.32 / 12, color: '#7a3a7a' },
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
