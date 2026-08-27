// Compute a "reading streak" — how many consecutive recent days the user has
// a daily report saved for. Uses the local-date strings ("YYYY-MM-DD") that
// the daily history stores.

export function readingStreak(historyDates: string[], todayStr: string): number {
  if (historyDates.length === 0) return 0;
  const set = new Set(historyDates);
  if (!set.has(todayStr)) return 0;
  let streak = 0;
  const cursor = new Date(todayStr + 'T00:00');
  while (true) {
    const y = cursor.getFullYear();
    const m = (cursor.getMonth() + 1).toString().padStart(2, '0');
    const d = cursor.getDate().toString().padStart(2, '0');
    const key = `${y}-${m}-${d}`;
    if (!set.has(key)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function uniqueReadDays(historyDates: string[]): number {
  return new Set(historyDates).size;
}
