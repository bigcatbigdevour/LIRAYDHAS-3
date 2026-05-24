// One-word "vibe tag" derived from the dominant transit's planets + aspect.

import type { TransitAspect } from '../types';

const VIBE_BY_PLANET: Record<string, string> = {
  Sun: 'awake',
  Moon: 'felt',
  Mercury: 'spoken',
  Venus: 'soft',
  Mars: 'hot',
  Jupiter: 'expanding',
  Saturn: 'heavy',
  Uranus: 'unstable',
  Neptune: 'foggy',
  Pluto: 'underneath',
};

const ASPECT_MOD: Record<string, string> = {
  conjunction: 'concentrated',
  sextile: 'open',
  square: 'pressed',
  trine: 'flowing',
  opposition: 'split',
};

export function dailyVibe(aspects: TransitAspect[]): string {
  if (!aspects.length) return 'quiet';
  // Weight by orb tightness; pick the planet most "active" today, with the aspect mood.
  const top = aspects[0];
  const planetWord = VIBE_BY_PLANET[top.transitPlanet] ?? 'present';
  const aspectWord = ASPECT_MOD[top.aspect] ?? '';
  return `${aspectWord} ${planetWord}`.trim();
}
