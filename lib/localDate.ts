/**
 * Local-calendar date string (YYYY-MM-DD).
 *
 * `Date#toISOString().slice(0, 10)` returns the UTC date, which silently
 * breaks at night for users west of UTC and in the morning for users east
 * of UTC: a user in UTC-5 at 8pm Wednesday gets "Thursday" from toISOString.
 *
 * This helper uses the user's local calendar fields so every "today" in
 * the app — saved-day keys, anniversary lookups, the SaveDayButton state,
 * the SavedHeatmap "today" highlight, compose-mode max date — agrees on
 * what day it is from the user's perspective.
 */
export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}
