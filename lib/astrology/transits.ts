import { Body, MakeTime } from 'astronomy-engine';
import type {
  NatalChart,
  PlanetName,
  TransitAspect,
} from '../types';
import { geocentricLongitude, meanNorthNode } from './natal';

interface AspectDef { name: TransitAspect['aspect']; angle: number; orb: number }

const ASPECTS: AspectDef[] = [
  { name: 'conjunction', angle: 0,   orb: 6 },
  { name: 'sextile',     angle: 60,  orb: 4 },
  { name: 'square',      angle: 90,  orb: 6 },
  { name: 'trine',       angle: 120, orb: 5 },
  { name: 'opposition',  angle: 180, orb: 6 },
];

function angularSeparation(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function natalLongitudes(natal: NatalChart): Record<PlanetName, number> {
  return {
    Sun: natal.sun.longitude,
    Moon: natal.moon.longitude,
    Mercury: natal.mercury.longitude,
    Venus: natal.venus.longitude,
    Mars: natal.mars.longitude,
    Jupiter: natal.jupiter.longitude,
    Saturn: natal.saturn.longitude,
    Uranus: natal.uranus.longitude,
    Neptune: natal.neptune.longitude,
    Pluto: natal.pluto.longitude,
    Chiron: natal.chiron?.longitude ?? -1,
    NorthNode: natal.northNode.longitude,
    SouthNode: (natal.northNode.longitude + 180) % 360,
    Earth: (natal.sun.longitude + 180) % 360,
  };
}

export interface TodaysTransits {
  positions: Record<PlanetName, number>;
  aspects: TransitAspect[];
}

const TRANSIT_BODIES: [PlanetName, Body][] = [
  ['Sun', Body.Sun],
  ['Moon', Body.Moon],
  ['Mercury', Body.Mercury],
  ['Venus', Body.Venus],
  ['Mars', Body.Mars],
  ['Jupiter', Body.Jupiter],
  ['Saturn', Body.Saturn],
  ['Uranus', Body.Uranus],
  ['Neptune', Body.Neptune],
  ['Pluto', Body.Pluto],
];

export function todaysTransits(natal: NatalChart, now = new Date()): TodaysTransits {
  const t = MakeTime(now);
  const positions: Partial<Record<PlanetName, number>> = {};
  for (const [name, body] of TRANSIT_BODIES) {
    positions[name] = geocentricLongitude(body, t);
  }
  positions.Earth = (positions.Sun! + 180) % 360;
  positions.NorthNode = meanNorthNode(t);
  positions.SouthNode = (positions.NorthNode + 180) % 360;
  positions.Chiron = -1; // skip Chiron transits for v1 punchiness

  const nat = natalLongitudes(natal);
  const aspects: TransitAspect[] = [];

  // Focus on the most expressive bodies for daily transits: skip the social
  // planets-to-social planets noise; include all transiting bodies to all
  // natal placements except SouthNode→SouthNode etc. duplicates.
  const transitingPlanets = TRANSIT_BODIES.map(([n]) => n);
  const natalPlanets: PlanetName[] = [
    'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
    'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
    'NorthNode',
  ];

  for (const tp of transitingPlanets) {
    const tpLon = positions[tp];
    if (tpLon === undefined || tpLon < 0) continue;
    for (const np of natalPlanets) {
      const npLon = nat[np];
      if (npLon < 0) continue;
      const sep = angularSeparation(tpLon, npLon);
      for (const asp of ASPECTS) {
        const orb = Math.abs(sep - asp.angle);
        if (orb <= asp.orb) {
          aspects.push({
            transitPlanet: tp,
            natalPlanet: np,
            aspect: asp.name,
            orb,
            transitLongitude: tpLon,
            natalLongitude: npLon,
          });
        }
      }
    }
  }

  // Rank: tightest orbs first, slow planets weighted heavier.
  const weight: Partial<Record<PlanetName, number>> = {
    Pluto: 0.4, Neptune: 0.5, Uranus: 0.6, Saturn: 0.7, Jupiter: 0.85,
    Mars: 0.95, Venus: 1.0, Mercury: 1.05, Sun: 0.9, Moon: 1.1,
  };
  aspects.sort((a, b) => {
    const wa = (weight[a.transitPlanet] ?? 1) * (weight[a.natalPlanet] ?? 1);
    const wb = (weight[b.transitPlanet] ?? 1) * (weight[b.natalPlanet] ?? 1);
    return a.orb * wa - b.orb * wb;
  });

  return { positions: positions as Record<PlanetName, number>, aspects };
}

export function pickTopAspects(aspects: TransitAspect[], n = 3): TransitAspect[] {
  // Deduplicate same-pair / same-aspect (e.g. orb-band overlaps).
  const seen = new Set<string>();
  const out: TransitAspect[] = [];
  for (const a of aspects) {
    const k = `${a.transitPlanet}|${a.natalPlanet}|${a.aspect}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(a);
    if (out.length >= n) break;
  }
  return out;
}

export interface UpcomingAspect {
  daysAhead: number;
  date: string;          // YYYY-MM-DD
  aspect: TransitAspect;
}

/**
 * Detect retrograde motion of the inner planets at `now`.
 * Returns the set of planets currently retrograde (apparent geocentric motion).
 */
export function currentRetrogrades(now = new Date()): PlanetName[] {
  const out: PlanetName[] = [];
  const planets: [PlanetName, Body][] = [
    ['Mercury', Body.Mercury],
    ['Venus', Body.Venus],
    ['Mars', Body.Mars],
    ['Jupiter', Body.Jupiter],
    ['Saturn', Body.Saturn],
  ];
  const dt = 86400 * 1000; // 1 day in ms
  for (const [name, body] of planets) {
    const a = geocentricLongitude(body, MakeTime(new Date(now.getTime() - dt)));
    const b = geocentricLongitude(body, MakeTime(new Date(now.getTime() + dt)));
    let delta = b - a;
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;
    // Mercury/Venus retrograde when apparent motion is negative.
    // Outer planets too, but we only flag the inner + Jupiter/Saturn here.
    if (delta < 0) out.push(name);
  }
  return out;
}

/**
 * Sample transits for the next `days` days and pick the tightest non-duplicate
 * aspects per (transit planet, natal planet, aspect) triple, returning the
 * single tightest hit (closest to exact) per triple.
 */
export function upcomingForecast(natal: NatalChart, days = 7): UpcomingAspect[] {
  const tightest = new Map<string, UpcomingAspect>();
  for (let d = 0; d <= days; d++) {
    const day = new Date(Date.now() + d * 86400 * 1000);
    const { aspects } = todaysTransits(natal, day);
    for (const a of aspects) {
      const key = `${a.transitPlanet}|${a.natalPlanet}|${a.aspect}`;
      const cur = tightest.get(key);
      if (!cur || a.orb < cur.aspect.orb) {
        tightest.set(key, {
          daysAhead: d,
          date: day.toISOString().slice(0, 10),
          aspect: a,
        });
      }
    }
  }
  // Return tightest 4, sorted by orb
  return [...tightest.values()]
    .sort((a, b) => a.aspect.orb - b.aspect.orb)
    .slice(0, 5);
}
