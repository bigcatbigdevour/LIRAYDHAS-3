import type { CenterName } from '../types';

export const CENTER_GATES: Record<CenterName, number[]> = {
  Head:        [64, 61, 63],
  Ajna:        [47, 24, 4, 17, 43, 11],
  Throat:      [62, 23, 56, 35, 12, 45, 33, 8, 31, 20, 16],
  G:           [7, 1, 13, 25, 46, 2, 15, 10],
  Heart:       [21, 40, 26, 51],
  Sacral:      [5, 14, 29, 59, 9, 3, 42, 27, 34],
  SolarPlexus: [36, 22, 37, 6, 49, 55, 30],
  Spleen:      [48, 57, 44, 50, 32, 28, 18],
  Root:        [53, 60, 52, 19, 39, 41, 58, 38, 54],
};

const GATE_TO_CENTER: Record<number, CenterName> = {};
for (const [center, gates] of Object.entries(CENTER_GATES) as [CenterName, number[]][]) {
  for (const g of gates) GATE_TO_CENTER[g] = center;
}

export function centerOfGate(gate: number): CenterName {
  const c = GATE_TO_CENTER[gate];
  if (!c) throw new Error(`Gate ${gate} not assigned to any center`);
  return c;
}

export const CENTER_NAMES: CenterName[] = [
  'Head', 'Ajna', 'Throat', 'G', 'Heart',
  'Sacral', 'SolarPlexus', 'Spleen', 'Root',
];

/** Whether a center is a "motor" — drives manifestation. */
export const MOTOR_CENTERS: CenterName[] = ['Sacral', 'Heart', 'SolarPlexus', 'Root'];

/** Pretty display label. */
export function centerLabel(c: CenterName): string {
  if (c === 'SolarPlexus') return 'Solar Plexus';
  if (c === 'G') return 'G';
  return c;
}
