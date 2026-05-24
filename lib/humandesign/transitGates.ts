// Compute today's HD-aware activations *relative to a user's blueprint*.
//
// - lit:        natal gates the user already has that are being re-activated today
// - completes:  channels that are temporarily completing today because today's
//               transit is sitting in one half of the channel and the user has the
//               other half natally (or vice versa)

import { Body, MakeTime } from 'astronomy-engine';
import { geocentricLongitude } from '../astrology/natal';
import { longitudeToGateLine } from './gateWheel';
import { ALL_CHANNELS } from './channels';
import type { Blueprint, PlanetName } from '../types';

export interface TransitActivation {
  planet: PlanetName;
  gate: number;
  line: number;
}

export interface UserTransits {
  /** Today's planet-by-planet HD activations (universal). */
  activations: TransitActivation[];
  /** Natal gates the user already has that are being touched again today, by which planet. */
  lit: { gate: number; line: number; planet: PlanetName }[];
  /** Channels that complete today because the transit is in one gate and the user has the other. */
  completes: {
    channel: [number, number];
    name: string;
    natalGate: number;
    transitGate: number;
    transitPlanet: PlanetName;
  }[];
}

const SLOW: [PlanetName, Body][] = [
  ['Sun', Body.Sun],
  ['Moon', Body.Moon],
  ['Mercury', Body.Mercury],
  ['Venus', Body.Venus],
  ['Mars', Body.Mars],
  ['Jupiter', Body.Jupiter],
  ['Saturn', Body.Saturn],
];

export function userTransits(bp: Blueprint, now = new Date()): UserTransits {
  const t = MakeTime(now);
  const natalGates = new Set(bp.humanDesign.activeGates.map((g) => g.gate));

  const activations: TransitActivation[] = SLOW.map(([name, body]) => {
    const lon = geocentricLongitude(body, t);
    const gl = longitudeToGateLine(lon);
    return { planet: name, gate: gl.gate, line: gl.line };
  });

  const lit: UserTransits['lit'] = [];
  for (const a of activations) {
    if (natalGates.has(a.gate)) {
      lit.push({ gate: a.gate, line: a.line, planet: a.planet });
    }
  }

  const completes: UserTransits['completes'] = [];
  for (const a of activations) {
    for (const ch of ALL_CHANNELS) {
      const [g1, g2] = ch.gates;
      if (a.gate === g1 && natalGates.has(g2) && !natalGates.has(g1)) {
        completes.push({
          channel: [g1, g2],
          name: ch.name,
          natalGate: g2,
          transitGate: g1,
          transitPlanet: a.planet,
        });
      } else if (a.gate === g2 && natalGates.has(g1) && !natalGates.has(g2)) {
        completes.push({
          channel: [g1, g2],
          name: ch.name,
          natalGate: g1,
          transitGate: g2,
          transitPlanet: a.planet,
        });
      }
    }
  }

  return { activations, lit, completes };
}
