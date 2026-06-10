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

import { useEffect, useState } from 'react';

/**
 * Reactive "today" ISO date that re-renders the consumer when the local
 * calendar rolls over to a new day. Why: a user can open /today at 11:59pm,
 * leave the tab open, and come back at 9am the next morning. Without this
 * hook the SaveDayButton would still target yesterday's dateIso, the
 * SavedHeatmap's "today" highlight would point at the wrong cell, and
 * compose-mode would let the user pick yesterday as their "today".
 *
 * Re-checks every 60 seconds AND on `visibilitychange` so a long-backgrounded
 * tab catches up immediately on focus. Avoid setTimeout-to-midnight tricks —
 * they're brittle when the tab is throttled or asleep.
 */
export function useToday(): string {
  const [today, setToday] = useState<string>(() => localDateStr());
  useEffect(() => {
    const tick = () => {
      const now = localDateStr();
      setToday((prev) => (prev === now ? prev : now));
    };
    const id = window.setInterval(tick, 60_000);
    const onVis = () => tick();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  return today;
}

