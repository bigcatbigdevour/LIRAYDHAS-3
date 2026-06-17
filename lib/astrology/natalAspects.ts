/**
 * Tightest natal aspects inside a single chart.
 *
 * The chart page draws coloured aspect lines on the natal wheel but
 * doesn't tell the user what each line MEANS. This module computes the
 * same aspect set the wheel draws, ranks by tightness, and returns a
 * shape the UI can pair with the existing aspectMeanings vocabulary —
 * a static, no-LLM "what's loud in this chart" panel.
 *
 * Why include outer planets here (vs. synastry, which excludes them):
 * inside a single chart, an outer's natal aspect to a personal planet
 * is foundational — a natal Pluto-Sun square defines a person's whole
 * relationship to power, not a generational trait. In cross-chart
 * synastry, the same aspect is mostly generational accident, which is
 * why lib/synastry.ts filters them out.
 */

import type { Blueprint, PlanetName } from '../types';

export type AspectKind = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';

const ASPECT_ANGLE: Record<AspectKind, number> = {
  conjunction: 0,
  sextile: 60,
  square: 90,
  trine: 120,
  opposition: 180,
};

const ORBS: Record<AspectKind, number> = {
  conjunction: 7,
  sextile: 4,
  square: 6,
  trine: 6,
  opposition: 7,
};

const NATAL_BODIES: PlanetName[] = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
];

export interface NatalAspect {
  a: PlanetName;
  b: PlanetName;
  kind: AspectKind;
  /** Degrees off the exact aspect angle. Smaller = louder. */
  orb: number;
}

function angularDelta(a: number, b: number): number {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

function bodyLon(bp: Blueprint, name: PlanetName): number | null {
  const n = bp.natal;
  // Defensive: a stale stored blueprint from a pre-enrichment version
  // of the app could be missing some planet objects. Guard each
  // access so this never throws on render; missing planets just drop
  // out of the aspect computation.
  const map: Partial<Record<PlanetName, number | undefined>> = {
    Sun: n.sun?.longitude,
    Moon: n.moon?.longitude,
    Mercury: n.mercury?.longitude,
    Venus: n.venus?.longitude,
    Mars: n.mars?.longitude,
    Jupiter: n.jupiter?.longitude,
    Saturn: n.saturn?.longitude,
    Uranus: n.uranus?.longitude,
    Neptune: n.neptune?.longitude,
    Pluto: n.pluto?.longitude,
  };
  const v = map[name];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * Return the chart's tightest natal aspects, capped at `limit`.
 *
 * Generational outer-to-outer pairs (e.g. Uranus-Neptune) are dropped
 * because they describe an era, not a person. Personal-to-outer and
 * personal-to-personal stay.
 */
export function computeNatalAspects(bp: Blueprint, limit = 6): NatalAspect[] {
  const OUTERS: PlanetName[] = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  const isOuter = (p: PlanetName) => OUTERS.includes(p);

  const out: NatalAspect[] = [];
  for (let i = 0; i < NATAL_BODIES.length; i++) {
    const a = NATAL_BODIES[i];
    const aLon = bodyLon(bp, a);
    if (aLon == null) continue;
    for (let j = i + 1; j < NATAL_BODIES.length; j++) {
      const b = NATAL_BODIES[j];
      // Both outers — generational, not personal. Skip.
      if (isOuter(a) && isOuter(b)) continue;
      const bLon = bodyLon(bp, b);
      if (bLon == null) continue;
      const sep = angularDelta(aLon, bLon);
      let best: { kind: AspectKind; orb: number } | null = null;
      for (const kind of Object.keys(ASPECT_ANGLE) as AspectKind[]) {
        const orb = Math.abs(sep - ASPECT_ANGLE[kind]);
        if (orb <= ORBS[kind] && (best == null || orb < best.orb)) {
          best = { kind, orb };
        }
      }
      if (best) out.push({ a, b, kind: best.kind, orb: best.orb });
    }
  }
  return out.sort((x, y) => x.orb - y.orb).slice(0, limit);
}
