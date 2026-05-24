// Plain-language one-liners for what a given aspect tends to do.

import type { PlanetName } from '../types';

type Aspect = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';

const GENERIC: Record<Aspect, string> = {
  conjunction: 'fuses the two themes. Hard to separate one signal from the other.',
  sextile:     'opens a small door. Easy to walk through if you notice it.',
  square:      'friction. Two themes that won\'t fit politely in the same room.',
  trine:       'flow. Maybe so easy you skip the lesson.',
  opposition:  'a see-saw. You can hold both but not simultaneously.',
};

const SPECIFIC: Partial<Record<string, string>> = {
  // a few high-signal combos; fall back to generic otherwise
  'Saturn|Sun|conjunction':     'compression. The work asks for a higher standard than yesterday.',
  'Saturn|Sun|square':          'authority friction. A teacher returns dressed as an obstacle.',
  'Saturn|Sun|opposition':      'reality check. The pace you set is being measured.',
  'Jupiter|Sun|conjunction':    'a door opens. Easy yeses today are not free.',
  'Jupiter|Sun|trine':          'expansion. The path of least resistance is actually correct.',
  'Mars|Mars|conjunction':      'new fight. Whatever you start today, you\'re going to keep starting.',
  'Pluto|Sun|conjunction':      'rebirth pressure. The version of you that worked last year is up for replacement.',
  'Pluto|Sun|square':           'power friction. Don\'t fold to it; don\'t pick it up either.',
  'Neptune|Sun|conjunction':    'fog. Trust nothing you decide quickly.',
  'Uranus|Sun|conjunction':     'disruption. Plans rearrange themselves around something unscheduled.',
  'Moon|Moon|conjunction':      'a quiet reset of mood. Today belongs to feeling, not solving.',
  'Moon|Moon|square':           'emotional friction. Whatever the room is doing, you\'re doing twice.',
};

export function aspectMeaning(
  transit: PlanetName,
  natal: PlanetName,
  aspect: Aspect,
): string {
  const key = `${transit}|${natal}|${aspect}`;
  return SPECIFIC[key] ?? GENERIC[aspect];
}
