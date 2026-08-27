/**
 * Compatibility math — how two charts meet, AND where each person is in
 * their own life at the same moment.
 *
 * The "life-stage" angle is what makes this different from a generic
 * synastry calculator: a Saturn-trine-Sun between two charts feels very
 * different when one person is 28 (approaching their Saturn return)
 * vs. 45 (deep in midlife). We surface both signals together so the
 * user can read the chart contact in context.
 */

import type { Blueprint, PlanetName, ZodiacSign } from './types';
import { ALL_CHANNELS } from './humandesign/channels';
import { ageInYears, positionInCycles, type CyclePosition } from './cycles';
import { currentChapter } from './lifeChapters';

export type AspectKind = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';

const ASPECT_ANGLE: Record<AspectKind, number> = {
  conjunction: 0,
  sextile: 60,
  square: 90,
  trine: 120,
  opposition: 180,
};

/** Tight orb for synastry. Looser than transits because cross-chart
 *  aspects are less precise to begin with. */
const ORBS: Record<AspectKind, number> = {
  conjunction: 8,
  sextile: 4,
  square: 6,
  trine: 6,
  opposition: 8,
};

/** Only these planets / luminaries / nodes are used for synastry. The
 *  outers (Uranus / Neptune / Pluto) drift slowly so cross-chart aspects
 *  to them are generational, not personal. */
const SYNASTRY_BODIES: PlanetName[] = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'NorthNode',
];

export interface SynastryAspect {
  aBody: PlanetName;
  bBody: PlanetName;
  kind: AspectKind;
  /** Angular separation in degrees from the exact aspect angle. */
  orb: number;
  /** Tightness rank — smaller = more exact, used for sorting / display. */
  tightness: number;
}

function angularDelta(a: number, b: number): number {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

function bodyLon(bp: Blueprint, name: PlanetName): number | null {
  const n = bp.natal;
  const map: Partial<Record<PlanetName, number>> = {
    Sun: n.sun.longitude,
    Moon: n.moon.longitude,
    Mercury: n.mercury.longitude,
    Venus: n.venus.longitude,
    Mars: n.mars.longitude,
    Jupiter: n.jupiter.longitude,
    Saturn: n.saturn.longitude,
    Uranus: n.uranus.longitude,
    Neptune: n.neptune.longitude,
    Pluto: n.pluto.longitude,
    Chiron: n.chiron?.longitude,
    NorthNode: n.northNode.longitude,
  };
  const v = map[name];
  return typeof v === 'number' ? v : null;
}

function bodySign(bp: Blueprint, name: PlanetName): ZodiacSign | null {
  const n = bp.natal;
  const map: Partial<Record<PlanetName, ZodiacSign>> = {
    Sun: n.sun.sign,
    Moon: n.moon.sign,
    Mercury: n.mercury.sign,
    Venus: n.venus.sign,
    Mars: n.mars.sign,
    Jupiter: n.jupiter.sign,
    Saturn: n.saturn.sign,
    Uranus: n.uranus.sign,
    Neptune: n.neptune.sign,
    Pluto: n.pluto.sign,
    Chiron: n.chiron?.sign,
    NorthNode: n.northNode.sign,
  };
  return map[name] ?? null;
}

export function computeSynastryAspects(a: Blueprint, b: Blueprint): SynastryAspect[] {
  const out: SynastryAspect[] = [];
  for (const aBody of SYNASTRY_BODIES) {
    const aLon = bodyLon(a, aBody);
    if (aLon == null) continue;
    for (const bBody of SYNASTRY_BODIES) {
      const bLon = bodyLon(b, bBody);
      if (bLon == null) continue;
      const sep = angularDelta(aLon, bLon);
      for (const kind of Object.keys(ASPECT_ANGLE) as AspectKind[]) {
        const target = ASPECT_ANGLE[kind];
        const orb = Math.abs(sep - target);
        if (orb <= ORBS[kind]) {
          out.push({
            aBody,
            bBody,
            kind,
            orb,
            tightness: orb,
          });
        }
      }
    }
  }
  // Sort by tightness, keep the top 8 to keep the display + LLM prompt focused.
  return out.sort((x, y) => x.tightness - y.tightness).slice(0, 8);
}

export interface ElectricChannel {
  /** The channel that lights up between the two charts. */
  gates: [number, number];
  name: string;
  /** Which person has which gate. */
  ownership: {
    /** Person A's gate (and 0..1 line if known). */
    a: { gate: number; line?: number } | null;
    /** Person B's gate. */
    b: { gate: number; line?: number } | null;
  };
}

/**
 * Electric channels — channels where each person carries one gate.
 * In HD lore this is the "electric" / "current" connection: each person
 * alone doesn't have the channel, but together they do.
 */
export function computeElectricChannels(a: Blueprint, b: Blueprint): ElectricChannel[] {
  const aGates = new Set(a.humanDesign.activeGates.map((g) => g.gate));
  const bGates = new Set(b.humanDesign.activeGates.map((g) => g.gate));
  const aChannels = new Set(a.humanDesign.activeChannels.map((c) => c.join('-')));
  const bChannels = new Set(b.humanDesign.activeChannels.map((c) => c.join('-')));

  const electric: ElectricChannel[] = [];
  for (const ch of ALL_CHANNELS) {
    const [g1, g2] = ch.gates;
    const aHas = aGates.has(g1) ? g1 : aGates.has(g2) ? g2 : null;
    const bHas = bGates.has(g1) ? g1 : bGates.has(g2) ? g2 : null;
    if (!aHas || !bHas) continue;
    // Only "electric" when neither person already has both gates (which
    // would make the channel defined in their own chart).
    const chKey = `${g1}-${g2}`;
    const chKeyRev = `${g2}-${g1}`;
    if (aChannels.has(chKey) || aChannels.has(chKeyRev)) continue;
    if (bChannels.has(chKey) || bChannels.has(chKeyRev)) continue;
    // Must be DIFFERENT gates contributed by each side (else they both
    // have the same single gate, not enough).
    if (aHas === bHas) continue;
    electric.push({
      gates: [g1, g2],
      name: ch.name,
      ownership: {
        a: { gate: aHas },
        b: { gate: bHas },
      },
    });
  }
  return electric;
}

export interface LifeStageDiff {
  ageA: number;
  ageB: number;
  /** Both ages rounded to 0.1. Convenience for callers. */
  ageGapYears: number;
  chapterA: ReturnType<typeof currentChapter>;
  chapterB: ReturnType<typeof currentChapter>;
  /** Same chapter? */
  sameChapter: boolean;
  /** Polarity stack for each person, today. Useful for "you're rising
   *  while they're descending" callouts. */
  polarityA: CyclePosition[];
  polarityB: CyclePosition[];
  /** Total rising cycles each. 0-7. */
  risingA: number;
  risingB: number;
}

export function computeLifeStageDiff(a: Blueprint, b: Blueprint, now: Date = new Date()): LifeStageDiff {
  const ageA = ageInYears(a.birth.iso, now);
  const ageB = ageInYears(b.birth.iso, now);
  const chapterA = currentChapter(ageA);
  const chapterB = currentChapter(ageB);
  const polarityA = positionInCycles(ageA);
  const polarityB = positionInCycles(ageB);
  return {
    ageA,
    ageB,
    ageGapYears: Math.round(Math.abs(ageA - ageB) * 10) / 10,
    chapterA,
    chapterB,
    sameChapter: chapterA?.label === chapterB?.label,
    polarityA,
    polarityB,
    risingA: polarityA.filter((p) => p.positive).length,
    risingB: polarityB.filter((p) => p.positive).length,
  };
}

/** Helper for the LLM prompt — turn the aspect into one descriptive line. */
export function aspectLabel(asp: SynastryAspect, aName: string, bName: string): string {
  return `${aName}'s ${asp.aBody} ${asp.kind} ${bName}'s ${asp.bBody} (orb ${asp.orb.toFixed(1)}°)`;
}

/** Helper for the LLM prompt — describe an electric channel in one line. */
export function electricChannelLabel(
  ch: ElectricChannel,
  aName: string,
  bName: string,
): string {
  const aGate = ch.ownership.a?.gate;
  const bGate = ch.ownership.b?.gate;
  return `the ${ch.name} channel (${ch.gates[0]}-${ch.gates[1]}): ${aName} brings gate ${aGate}, ${bName} brings gate ${bGate}`;
}

export { bodySign };
