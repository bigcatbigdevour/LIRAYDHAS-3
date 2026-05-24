// Derive HD type, authority, profile, definition, defined centers, active
// channels and incarnation cross from the activations of the two charts.

import type {
  ActiveGate,
  CenterName,
  HDAuthority,
  HDDefinition,
  HDType,
  HumanDesign,
  PlanetName,
  Profile,
} from '../types';
import { centerOfGate, MOTOR_CENTERS } from './centers';
import { ALL_CHANNELS } from './channels';
import { longitudeToGateLine } from './gateWheel';
import type { DesignActivations } from '../astrology/natal';

const PLANET_NAMES_IN_ORDER: PlanetName[] = [
  'Sun', 'Earth', 'NorthNode', 'SouthNode', 'Moon',
  'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn',
  'Uranus', 'Neptune', 'Pluto',
];

export function activationsToGates(
  a: DesignActivations,
  chart: 'personality' | 'design',
): ActiveGate[] {
  const map: [PlanetName, number][] = [
    ['Sun', a.sun],
    ['Earth', a.earth],
    ['NorthNode', a.northNode],
    ['SouthNode', a.southNode],
    ['Moon', a.moon],
    ['Mercury', a.mercury],
    ['Venus', a.venus],
    ['Mars', a.mars],
    ['Jupiter', a.jupiter],
    ['Saturn', a.saturn],
    ['Uranus', a.uranus],
    ['Neptune', a.neptune],
    ['Pluto', a.pluto],
  ];
  return map.map(([planet, lon]) => {
    const gl = longitudeToGateLine(lon);
    return { gate: gl.gate, line: gl.line, planet, chart, longitude: lon };
  });
}

/**
 * Build a graph of defined centers and active channels from the activations.
 */
export interface DefinitionState {
  activeGates: Set<number>;
  activeChannels: [number, number][];
  definedCenters: Set<CenterName>;
  /** adjacency map for definition-component analysis */
  adjacency: Map<CenterName, Set<CenterName>>;
}

export function computeDefinition(activeGates: Set<number>): DefinitionState {
  const activeChannels: [number, number][] = [];
  const definedCenters = new Set<CenterName>();
  const adjacency = new Map<CenterName, Set<CenterName>>();

  for (const ch of ALL_CHANNELS) {
    const [a, b] = ch.gates;
    if (activeGates.has(a) && activeGates.has(b)) {
      activeChannels.push([a, b]);
      const ca = ch.centers[0];
      const cb = ch.centers[1];
      definedCenters.add(ca);
      definedCenters.add(cb);
      if (ca !== cb) {
        if (!adjacency.has(ca)) adjacency.set(ca, new Set());
        if (!adjacency.has(cb)) adjacency.set(cb, new Set());
        adjacency.get(ca)!.add(cb);
        adjacency.get(cb)!.add(ca);
      } else {
        if (!adjacency.has(ca)) adjacency.set(ca, new Set());
      }
    }
  }

  return { activeGates, activeChannels, definedCenters, adjacency };
}

/** Count connected components in the defined-centers graph. */
export function definitionComponents(state: DefinitionState): number {
  return definitionGroups(state).length;
}

/** Return the connected components of defined centers. Each component is the list of center names. */
export function definitionGroups(state: DefinitionState): CenterName[][] {
  const seen = new Set<CenterName>();
  const groups: CenterName[][] = [];
  for (const c of state.definedCenters) {
    if (seen.has(c)) continue;
    const group: CenterName[] = [];
    const queue: CenterName[] = [c];
    while (queue.length) {
      const x = queue.shift()!;
      if (seen.has(x)) continue;
      seen.add(x);
      group.push(x);
      const neigh = state.adjacency.get(x);
      if (neigh) for (const n of neigh) if (!seen.has(n)) queue.push(n);
    }
    groups.push(group);
  }
  return groups;
}

export function definitionLabel(state: DefinitionState): HDDefinition {
  if (state.definedCenters.size === 0) return 'No Definition';
  const n = definitionComponents(state);
  switch (n) {
    case 1: return 'Single';
    case 2: return 'Split';
    case 3: return 'Triple Split';
    case 4: return 'Quadruple Split';
    default: return 'Quadruple Split';
  }
}

/** Does the Throat have a defined channel reaching a motor center (any path)? */
export function throatConnectsToMotor(state: DefinitionState): boolean {
  if (!state.definedCenters.has('Throat')) return false;
  // BFS from Throat across the defined-center graph.
  const seen = new Set<CenterName>();
  const queue: CenterName[] = ['Throat'];
  while (queue.length) {
    const x = queue.shift()!;
    if (seen.has(x)) continue;
    seen.add(x);
    if (MOTOR_CENTERS.includes(x)) return true;
    const neigh = state.adjacency.get(x);
    if (neigh) for (const n of neigh) if (!seen.has(n)) queue.push(n);
  }
  return false;
}

/** Throat connects to a NON-Sacral motor? */
export function throatConnectsToNonSacralMotor(state: DefinitionState): boolean {
  if (!state.definedCenters.has('Throat')) return false;
  const seen = new Set<CenterName>();
  const queue: CenterName[] = ['Throat'];
  while (queue.length) {
    const x = queue.shift()!;
    if (seen.has(x)) continue;
    seen.add(x);
    if (x !== 'Sacral' && MOTOR_CENTERS.includes(x)) return true;
    const neigh = state.adjacency.get(x);
    if (neigh) for (const n of neigh) if (!seen.has(n)) queue.push(n);
  }
  return false;
}

export function deriveType(state: DefinitionState): HDType {
  const sacralDefined = state.definedCenters.has('Sacral');
  if (state.definedCenters.size === 0) return 'Reflector';
  const throatToMotor = throatConnectsToMotor(state);
  if (sacralDefined && throatToMotor) return 'Manifesting Generator';
  if (sacralDefined) return 'Generator';
  // Sacral undefined:
  if (throatConnectsToNonSacralMotor(state)) return 'Manifestor';
  return 'Projector';
}

export function strategyOfType(type: HDType): string {
  switch (type) {
    case 'Manifestor': return 'To Inform';
    case 'Generator':
    case 'Manifesting Generator':
      return 'To Respond';
    case 'Projector': return 'Wait for the Invitation';
    case 'Reflector': return 'Wait a Lunar Cycle';
  }
}

/** Standard authority priority. */
export function deriveAuthority(
  state: DefinitionState,
  type: HDType,
): HDAuthority {
  if (type === 'Reflector') return 'Lunar';
  if (state.definedCenters.has('SolarPlexus')) return 'Emotional';
  if (state.definedCenters.has('Sacral')) return 'Sacral';
  if (state.definedCenters.has('Spleen')) return 'Splenic';
  if (state.definedCenters.has('Heart')) return 'Ego';
  if (state.definedCenters.has('G')) return 'Self-projected';
  // Throat-only-defined Projector → Mental.
  return 'Mental';
}

/**
 * Profile = personality-Sun-line / design-Sun-line.
 */
export function deriveProfile(
  personality: ActiveGate[],
  design: ActiveGate[],
): Profile {
  const pSun = personality.find((g) => g.planet === 'Sun');
  const dSun = design.find((g) => g.planet === 'Sun');
  const a = (pSun?.line ?? 1) as 1 | 2 | 3 | 4 | 5 | 6;
  const b = (dSun?.line ?? 1) as 1 | 2 | 3 | 4 | 5 | 6;
  return `${a}/${b}` as Profile;
}

/** "Cross of the X" — name lookup is optional. We display the four gates. */
export function deriveIncarnationCross(
  personality: ActiveGate[],
  design: ActiveGate[],
): string {
  const pSun = personality.find((g) => g.planet === 'Sun');
  const pEarth = personality.find((g) => g.planet === 'Earth');
  const dSun = design.find((g) => g.planet === 'Sun');
  const dEarth = design.find((g) => g.planet === 'Earth');
  if (!pSun || !pEarth || !dSun || !dEarth) return '—';
  return `${pSun.gate}/${pEarth.gate} | ${dSun.gate}/${dEarth.gate}`;
}

export function deriveHumanDesign(
  personality: ActiveGate[],
  design: ActiveGate[],
): HumanDesign {
  const activeGates = new Set<number>();
  for (const g of personality) activeGates.add(g.gate);
  for (const g of design) activeGates.add(g.gate);

  const state = computeDefinition(activeGates);
  const type = deriveType(state);
  const authority = deriveAuthority(state, type);
  const profile = deriveProfile(personality, design);
  const definition = definitionLabel(state);
  const strategy = strategyOfType(type);
  const splits = definitionGroups(state);

  return {
    type,
    strategy,
    authority,
    profile,
    definition,
    definedCenters: Array.from(state.definedCenters),
    activeGates: [...personality, ...design],
    activeChannels: state.activeChannels,
    incarnationCross: deriveIncarnationCross(personality, design),
    splits,
  };
}

/** Order used in the bodygraph "personality crystal" column. */
export const PERSONALITY_ORDER = PLANET_NAMES_IN_ORDER;
