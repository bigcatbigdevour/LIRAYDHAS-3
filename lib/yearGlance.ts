// Deterministic text snapshot of the user's year ahead.

import type { Blueprint } from './types';
import { ageInYears } from './cycles';
import { currentChapter } from './lifeChapters';
import { upcomingEventsFeed } from './upcomingEvents';

export function yearGlanceText(bp: Blueprint, now = new Date()): string {
  const age = ageInYears(bp.birth.iso, now);
  const ch = currentChapter(age);
  const events = upcomingEventsFeed(bp.birth.iso, now, { horizonYears: 1 });

  const lines: string[] = [
    `Year ahead — from age ${age.toFixed(1)}.`,
  ];
  if (ch) lines.push(`Chapter: ${ch.label} (ages ${ch.startAge}–${ch.endAge}).`);
  lines.push('');
  lines.push('Events:');
  if (events.length === 0) lines.push('  (no major flips, returns, or stations in the next 12 months)');
  for (const e of events.slice(0, 30)) {
    const d = e.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const tag = e.kind === 'station' ? '◆' : e.kind === 'return' ? '✦' : '·';
    lines.push(`  ${d}  ${tag}  ${e.title} — ${e.detail}`);
  }
  return lines.join('\n');
}
