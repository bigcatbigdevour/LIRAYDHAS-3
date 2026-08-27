// One-word "vibe tag" derived from the dominant transit + the polarity
// stack lean.

import type { TransitAspect } from '../types';
import type { CyclePosition } from '../cycles';

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

export function dailyVibe(
  aspects: TransitAspect[],
  positions?: CyclePosition[],
): string {
  if (!aspects.length && (!positions || positions.length === 0)) return 'quiet';
  let base: string;
  if (aspects.length) {
    const top = aspects[0];
    const planetWord = VIBE_BY_PLANET[top.transitPlanet] ?? 'present';
    const aspectWord = ASPECT_MOD[top.aspect] ?? '';
    base = `${aspectWord} ${planetWord}`.trim();
  } else {
    base = 'quiet';
  }

  // Lean qualifier from the polarity stack: if mostly rising or mostly
  // descending by ≥ 2, prepend.
  if (positions && positions.length) {
    const rising = positions.filter((p) => p.positive).length;
    const descending = positions.length - rising;
    if (rising - descending >= 2) return `${base}, opening`;
    if (descending - rising >= 2) return `${base}, closing`;
  }
  return base;
}
