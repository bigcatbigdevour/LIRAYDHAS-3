// Deterministic text snapshot of the user's polarity stack.

import type { Blueprint } from './types';
import { positionInCycles, polarityFlips, ageInYears } from './cycles';
import { currentChapter } from './lifeChapters';

export function polarityGlanceText(bp: Blueprint, now = new Date()): string {
  const age = ageInYears(bp.birth.iso, now);
  const positions = positionInCycles(age);
  const flips = polarityFlips(bp.birth.iso, now);
  const rising = positions.filter((p) => p.positive).length;
  const ch = currentChapter(age);

  const recent = [...flips].sort((a, b) => a.daysSinceStart - b.daysSinceStart)[0];
  const next = [...flips].sort((a, b) => a.daysUntilEnd - b.daysUntilEnd)[0];

  const lines: string[] = [
    `Polarity at age ${age.toFixed(1)}: ${rising} rising · ${positions.length - rising} descending.`,
    ...positions.map((p) => `  ${p.cycle.glyph} ${p.cycle.label}: ${p.positive ? '↑' : '↓'} ${Math.round(p.fraction * 100)}%`),
  ];
  if (recent) lines.push(`Last flip: ${recent.cycle.label} ${Math.round(recent.daysSinceStart)}d ago to ${recent.positive ? 'rising' : 'descending'}.`);
  if (next) lines.push(`Next flip: ${next.cycle.label} in ${Math.round(next.daysUntilEnd)}d to ${next.positive ? 'descending' : 'rising'}.`);
  if (ch) lines.push(`Chapter: ${ch.label} (ages ${ch.startAge}–${ch.endAge}).`);
  return lines.join('\n');
}
