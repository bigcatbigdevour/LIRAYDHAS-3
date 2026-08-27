// Deterministic short text snapshot for the daily view. Always present,
// no LLM required. Used as a fallback / shareable summary on /today.

import type { Blueprint, TransitAspect, PlanetName } from './types';
import type { PolarityFlip } from './cycles';
import { positionInCycles, ageInYears } from './cycles';
import { currentChapter } from './lifeChapters';
import type { MoonState } from './astrology/moon';

export interface TodayGlanceInput {
  blueprint: Blueprint;
  transits: TransitAspect[];
  moon?: MoonState | null;
  retrogrades?: PlanetName[];
  recentFlips?: PolarityFlip[];
  todayLocal?: string;
}

export function todayGlanceText(input: TodayGlanceInput): string {
  const { blueprint, transits, moon, retrogrades = [], recentFlips = [], todayLocal } = input;
  const age = ageInYears(blueprint.birth.iso);
  const positions = positionInCycles(age);
  const rising = positions.filter((p) => p.positive).length;
  const ch = currentChapter(age);

  const lines: string[] = [];
  if (todayLocal) lines.push(todayLocal);
  if (moon) lines.push(`Moon: ${moon.name.toLowerCase()} in ${moon.moonSign} (${Math.round(moon.illumination * 100)}% illum).`);
  if (retrogrades.length) lines.push(`Retrograde: ${retrogrades.join(', ')}.`);
  lines.push(`Polarity: ${rising} rising / ${positions.length - rising} descending.`);
  if (ch) lines.push(`Life chapter: ${ch.label} (ages ${ch.startAge}–${ch.endAge}).`);
  if (transits.length) {
    lines.push('Top transits:');
    for (const t of transits.slice(0, 3)) {
      lines.push(`  ${t.transitPlanet} ${t.aspect} ${t.natalPlanet} (orb ${t.orb.toFixed(1)}°)`);
    }
  }
  if (recentFlips.length) {
    lines.push('Recent flips:');
    for (const f of recentFlips.slice(0, 2)) {
      lines.push(`  ${f.cycle.label} → ${f.positive ? 'rising' : 'descending'} (${Math.round(f.daysSinceStart)}d ago)`);
    }
  }
  return lines.join('\n');
}
