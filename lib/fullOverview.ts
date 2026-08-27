// Comprehensive deterministic text export of the entire blueprint +
// current cycles + year ahead. Used by /about's 'export everything'
// button.

import type { Blueprint } from './types';
import { chartGlanceText } from './chartGlance';
import { polarityGlanceText } from './polarityGlance';
import { yearGlanceText } from './yearGlance';
import { ageInYears } from './cycles';
import { currentChapter } from './lifeChapters';

export function fullOverviewText(bp: Blueprint, now = new Date()): string {
  const age = ageInYears(bp.birth.iso, now);
  const ch = currentChapter(age);
  return [
    `LIRAYDHAS · full overview`,
    `Born ${bp.birth.iso} · ${bp.birth.place}`,
    `Currently ${age.toFixed(1)}y · chapter: ${ch?.label ?? '—'}`,
    ``,
    `--- CHART ---`,
    chartGlanceText(bp),
    ``,
    `--- POLARITY ---`,
    polarityGlanceText(bp, now),
    ``,
    `--- YEAR AHEAD ---`,
    yearGlanceText(bp, now),
  ].join('\n');
}
