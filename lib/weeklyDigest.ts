/**
 * Monday-only "the week behind" digest that surfaces on /today.
 *
 * Not a separate page — that'd add a tab nobody'd visit. Just a small
 * card that opportunistically appears on Mondays (or whenever the user
 * opens the app the FIRST time in a new ISO week) summarizing what
 * happened the previous 7 days: saved entries, tides that flipped,
 * stations the user is near.
 *
 * The trick: it's not "weekly" if the user opens the app every day; it
 * fires once per ISO week. The dismissal flag is the week key, so next
 * week's card will appear fresh.
 */

import { polarityFlips } from './cycles';
import { listSavedDays, type SavedDay } from './savedDays';
import { localDateStr } from './localDate';

export interface WeeklyDigest {
  /** ISO week key like "2026-W23" — used to gate the card to one show per week. */
  weekKey: string;
  /** Human label like "the week of march 9". */
  label: string;
  /** Saved entries from the past 7 days, newest first. */
  recentEntries: SavedDay[];
  /** Polarity flips in the past 7 days. */
  recentFlips: { cycleLabel: string; positive: boolean; daysAgo: number }[];
  /** Tag counts from the past 7 days. */
  tagCounts: { tag: string; count: number }[];
}

/** ISO 8601 week key for a date (year of the Thursday in the same week). */
function isoWeekKey(d: Date): string {
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7 instead of 0.
  const dayNum = target.getDay() === 0 ? 7 : target.getDay();
  target.setDate(target.getDate() + 4 - dayNum);
  const yearStart = new Date(target.getFullYear(), 0, 1);
  const weekNo = Math.ceil(
    ((target.getTime() - yearStart.getTime()) / 86400_000 + 1) / 7,
  );
  return `${target.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Build the digest for the past 7 days ending at `now`. Returns null if
 * there's nothing notable (no saved entries AND no flips in the window) —
 * an empty digest isn't worth real estate.
 */
export function buildWeeklyDigest(
  birthIso: string,
  now: Date = new Date(),
): WeeklyDigest | null {
  const weekKey = isoWeekKey(now);
  const horizonMs = 7 * 86400_000;
  const nowMs = now.getTime();
  const since = new Date(nowMs - horizonMs);

  const allSaved = listSavedDays();
  const recentEntries = allSaved
    .filter((d) => {
      const dt = new Date(d.dateIso + 'T12:00:00').getTime();
      return dt >= since.getTime() && dt <= nowMs;
    })
    .sort((a, b) => (b.dateIso < a.dateIso ? -1 : 1));

  const flips = polarityFlips(birthIso, now);
  const recentFlips = flips
    .filter((f) => f.daysSinceStart <= 7)
    .sort((a, b) => a.daysSinceStart - b.daysSinceStart)
    .map((f) => ({
      cycleLabel: f.cycle.label.toLowerCase(),
      positive: f.positive,
      daysAgo: Math.round(f.daysSinceStart),
    }));

  const tagMap = new Map<string, number>();
  for (const e of recentEntries) {
    for (const t of e.tags ?? []) tagMap.set(t, (tagMap.get(t) ?? 0) + 1);
  }
  const tagCounts = Array.from(tagMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }));

  if (recentEntries.length === 0 && recentFlips.length === 0) return null;

  // Label: "the week of march 9" — first day of the window.
  const label = `the week of ${since.toLocaleDateString(undefined, {
    month: 'long', day: 'numeric',
  }).toLowerCase()}`;

  return { weekKey, label, recentEntries, recentFlips, tagCounts };
}

/**
 * Returns the digest if it should be shown right now (Monday OR first
 * visit of a new ISO week since last dismissal). Otherwise null.
 *
 * The state machine: store the last-shown weekKey. If today's weekKey
 * differs and it's been at least one calendar day since markWeeklyShown,
 * surface it. Dismissal stores the current weekKey so it stays hidden
 * until the next ISO week.
 */
const WEEK_KEY_STORE = 'liraydhas.weeklyDigest.lastShown.v1';

export function shouldShowWeeklyDigest(now: Date = new Date()): boolean {
  if (typeof window === 'undefined') return false;
  const weekKey = isoWeekKey(now);
  const lastShown = window.localStorage.getItem(WEEK_KEY_STORE);
  return lastShown !== weekKey;
}

export function markWeeklyShown(now: Date = new Date()): void {
  if (typeof window === 'undefined') return;
  const weekKey = isoWeekKey(now);
  window.localStorage.setItem(WEEK_KEY_STORE, weekKey);
}

/** Re-export for callers that want to display the current week key. */
export { isoWeekKey, localDateStr };
