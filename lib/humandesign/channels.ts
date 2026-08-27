import type { CenterName } from '../types';

export interface Channel {
  gates: [number, number];
  centers: [CenterName, CenterName];
  name: string;
}

/**
 * The canonical 36 channels of the Human Design system.
 * Each is a pair of gates connecting two centers.
 */
export const ALL_CHANNELS: Channel[] = [
  // Head ↔ Ajna (3)
  { gates: [64, 47], centers: ['Head', 'Ajna'], name: 'Abstraction' },
  { gates: [61, 24], centers: ['Head', 'Ajna'], name: 'Awareness' },
  { gates: [63, 4],  centers: ['Head', 'Ajna'], name: 'Logic' },
  // Ajna ↔ Throat (3)
  { gates: [17, 62], centers: ['Ajna', 'Throat'], name: 'Acceptance' },
  { gates: [43, 23], centers: ['Ajna', 'Throat'], name: 'Structuring' },
  { gates: [11, 56], centers: ['Ajna', 'Throat'], name: 'Curiosity' },
  // Throat ↔ G (4)
  { gates: [10, 20], centers: ['G', 'Throat'], name: 'Awakening' },
  { gates: [1, 8],   centers: ['G', 'Throat'], name: 'Inspiration' },
  { gates: [13, 33], centers: ['G', 'Throat'], name: 'The Prodigal' },
  { gates: [7, 31],  centers: ['G', 'Throat'], name: 'The Alpha' },
  // Throat ↔ Heart (1)
  { gates: [21, 45], centers: ['Heart', 'Throat'], name: 'Money' },
  // Throat ↔ Solar Plexus (2)
  { gates: [35, 36], centers: ['Throat', 'SolarPlexus'], name: 'Transitoriness' },
  { gates: [12, 22], centers: ['Throat', 'SolarPlexus'], name: 'Openness' },
  // Throat ↔ Spleen (2)
  { gates: [16, 48], centers: ['Throat', 'Spleen'], name: 'The Wave Length' },
  { gates: [20, 57], centers: ['Throat', 'Spleen'], name: 'The Brain Wave' },
  // Throat ↔ Sacral (1)
  { gates: [20, 34], centers: ['Throat', 'Sacral'], name: 'Charisma' },
  // G ↔ Sacral (4)
  { gates: [2, 14],  centers: ['G', 'Sacral'], name: 'The Beat' },
  { gates: [5, 15],  centers: ['G', 'Sacral'], name: 'Rhythm' },
  { gates: [29, 46], centers: ['G', 'Sacral'], name: 'Discovery' },
  { gates: [10, 34], centers: ['G', 'Sacral'], name: 'Exploration' },
  // G ↔ Heart (1)
  { gates: [25, 51], centers: ['G', 'Heart'], name: 'Initiation' },
  // G ↔ Spleen (1)
  { gates: [10, 57], centers: ['G', 'Spleen'], name: 'Perfected Form' },
  // Heart ↔ Spleen (1)
  { gates: [26, 44], centers: ['Heart', 'Spleen'], name: 'Surrender' },
  // Heart ↔ Solar Plexus (1)
  { gates: [37, 40], centers: ['Heart', 'SolarPlexus'], name: 'Community' },
  // Sacral ↔ Spleen (2)
  { gates: [34, 57], centers: ['Sacral', 'Spleen'], name: 'Power' },
  { gates: [27, 50], centers: ['Sacral', 'Spleen'], name: 'Preservation' },
  // Sacral ↔ Solar Plexus (1)
  { gates: [59, 6],  centers: ['Sacral', 'SolarPlexus'], name: 'Mating' },
  // Sacral ↔ Root (3)
  { gates: [3, 60],  centers: ['Sacral', 'Root'], name: 'Mutation' },
  { gates: [9, 52],  centers: ['Sacral', 'Root'], name: 'Concentration' },
  { gates: [42, 53], centers: ['Sacral', 'Root'], name: 'Maturation' },
  // Spleen ↔ Root (3)
  { gates: [18, 58], centers: ['Spleen', 'Root'], name: 'Judgment' },
  { gates: [32, 54], centers: ['Spleen', 'Root'], name: 'Transformation' },
  { gates: [28, 38], centers: ['Spleen', 'Root'], name: 'Struggle' },
  // Solar Plexus ↔ Root (3)
  { gates: [30, 41], centers: ['SolarPlexus', 'Root'], name: 'Recognition' },
  { gates: [55, 39], centers: ['SolarPlexus', 'Root'], name: 'Emoting' },
  { gates: [19, 49], centers: ['SolarPlexus', 'Root'], name: 'Synthesis' },
];

// Sanity: there must be 36.
if (ALL_CHANNELS.length !== 36) {
  // eslint-disable-next-line no-console
  console.warn(`[HD] expected 36 channels, found ${ALL_CHANNELS.length}`);
}

// Map gate → channels containing it.
export const CHANNELS_BY_GATE: Record<number, Channel[]> = (() => {
  const m: Record<number, Channel[]> = {};
  for (const ch of ALL_CHANNELS) {
    for (const g of ch.gates) {
      if (!m[g]) m[g] = [];
      m[g].push(ch);
    }
  }
  return m;
})();
