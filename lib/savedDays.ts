/**
 * Saved-readings persistence (localStorage-only, single-device).
 *
 * Premise: a daily-use app needs a reason to come back beyond curiosity.
 * Letting the user save a day's reading turns the app into a quiet journal
 * over time — "what did I read on the day my project failed", "what was I
 * told the week I met them". No remote sync, no account. Just a private
 * timeline on the user's device.
 *
 * Storage shape: a single JSON array under one key. Cheap because each
 * saved entry is small (~1KB), and the user is unlikely to save more
 * than ~1/day.
 */

export interface SavedDay {
  /** ISO date (YYYY-MM-DD) the reading was for. Unique per saved day. */
  dateIso: string;
  /**
   * The LLM-generated paragraph that was on screen when saved. Empty
   * string for pure journal entries (the user wrote a note without
   * saving a reading). Renderers should treat empty / missing as
   * "no reading attached, this is a pure journal entry".
   */
  paragraph: string;
  /** Tightest transit label, e.g. "Saturn square Sun" — for the list view. */
  headline?: string;
  /** Optional free-text note the user wrote when saving. */
  note?: string;
  /** Epoch ms the entry was created. */
  savedAt: number;
  /**
   * Snapshot of the sky / personal-cycle context the day this was saved.
   * Optional because pre-existing saved days don't have it; new saves do.
   * Stored alongside the reading so future anniversaries can compare
   * "the moon was waxing then; it's waning now" without re-deriving.
   */
  snapshot?: {
    moonPhase?: string;     // e.g. "waxing gibbous"
    moonSign?: string;      // e.g. "Cancer"
    chapter?: string;       // life chapter label, e.g. "Young adulthood"
    ageYears?: number;      // user's age at save time, rounded to 1dp
  };
}

const KEY = 'liraydhas.savedDays.v1';

function read(): SavedDay[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is SavedDay =>
        typeof x === 'object' && x !== null &&
        typeof (x as SavedDay).dateIso === 'string' &&
        typeof (x as SavedDay).paragraph === 'string' &&
        typeof (x as SavedDay).savedAt === 'number'
    );
  } catch {
    return [];
  }
}

function write(list: SavedDay[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
}

export function listSavedDays(): SavedDay[] {
  return read().sort((a, b) => b.savedAt - a.savedAt);
}

export function isSaved(dateIso: string): boolean {
  return read().some((d) => d.dateIso === dateIso);
}

/**
 * Save (or merge into) an entry for `entry.dateIso`. Merging matters
 * because a user may have composed a pure journal entry for today first
 * and then later tapped ☆ on the daily reading — naive replace would
 * wipe their note. Rules: incoming non-empty fields win; existing
 * paragraph / note / headline / snapshot survive if the incoming entry
 * left them blank.
 */
export function saveDay(entry: SavedDay): void {
  const list = read();
  const existing = list.find((d) => d.dateIso === entry.dateIso);
  const merged: SavedDay = existing
    ? {
        dateIso: entry.dateIso,
        paragraph: entry.paragraph || existing.paragraph,
        headline: entry.headline ?? existing.headline,
        note: entry.note ?? existing.note,
        snapshot: entry.snapshot ?? existing.snapshot,
        savedAt: existing.savedAt, // preserve original save time
      }
    : entry;
  const others = list.filter((d) => d.dateIso !== entry.dateIso);
  others.push(merged);
  write(others);
}

export function unsaveDay(dateIso: string): void {
  write(read().filter((d) => d.dateIso !== dateIso));
}

export function updateNote(dateIso: string, note: string): void {
  const list = read();
  const i = list.findIndex((d) => d.dateIso === dateIso);
  if (i < 0) return;
  list[i] = { ...list[i], note };
  write(list);
}

export interface SavedMonth {
  /** YYYY-MM key for sorting and React keys. */
  key: string;
  /** Display label like "March 2026". */
  label: string;
  days: SavedDay[];
}

/**
 * Group saved days into months, newest month first, days within each month
 * newest first. Empty months are not represented — only months containing
 * saved days. The "books-on-a-shelf" view that makes the page feel like
 * a journal rather than a flat list.
 */
export function groupByMonth(days: SavedDay[]): SavedMonth[] {
  const buckets = new Map<string, SavedDay[]>();
  for (const d of days) {
    const date = new Date(d.dateIso + 'T12:00:00');
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const arr = buckets.get(key) ?? [];
    arr.push(d);
    buckets.set(key, arr);
  }
  return Array.from(buckets.entries())
    .map(([key, arr]) => {
      const [y, m] = key.split('-').map(Number);
      const label = new Date(y, m - 1, 1).toLocaleString(undefined, {
        month: 'long',
        year: 'numeric',
      });
      return {
        key,
        label,
        days: arr.slice().sort((a, b) => (b.dateIso < a.dateIso ? -1 : 1)),
      };
    })
    .sort((a, b) => (b.key < a.key ? -1 : 1));
}

/**
 * Lightweight search across paragraph + note + headline. Case-insensitive,
 * matches if every space-separated query term appears somewhere. Returns
 * the day list filtered (and in input order, so caller controls ordering).
 */
export function searchSavedDays(days: SavedDay[], query: string): SavedDay[] {
  const q = query.trim().toLowerCase();
  if (!q) return days;
  const terms = q.split(/\s+/).filter(Boolean);
  return days.filter((d) => {
    const hay = `${d.paragraph} ${d.note ?? ''} ${d.headline ?? ''}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}

/**
 * Find a saved day from N years ago today (within a 3-day window). Used by
 * /today for the "this day a year ago" callout — the sticky daily-use hook
 * that surfaces a saved reading exactly when the anniversary lands.
 */
export function anniversaryDay(yearsAgo: number, now = new Date()): SavedDay | null {
  if (yearsAgo <= 0) return null;
  const target = new Date(now);
  target.setFullYear(target.getFullYear() - yearsAgo);
  const list = read();
  let best: SavedDay | null = null;
  let bestDist = Infinity;
  for (const d of list) {
    const dt = new Date(d.dateIso + 'T12:00:00');
    const distDays = Math.abs(dt.getTime() - target.getTime()) / 86400_000;
    if (distDays < bestDist && distDays <= 3) {
      best = d;
      bestDist = distDays;
    }
  }
  return best;
}

/**
 * Render every saved day to plain text — for the "export all" share button.
 * The user owns their journal; they should be able to take it with them.
 */
export function exportToText(days: SavedDay[]): string {
  if (days.length === 0) return '(no saved days yet)';
  const sorted = days.slice().sort((a, b) => (a.dateIso < b.dateIso ? -1 : 1));
  return sorted
    .map((d) => {
      const date = new Date(d.dateIso + 'T12:00:00').toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const out: string[] = [date.toUpperCase()];
      if (d.headline) out.push(`(${d.headline})`);
      if (d.paragraph) {
        out.push('', d.paragraph);
      }
      if (d.note) {
        out.push('', d.paragraph ? '— note —' : '— journal —', d.note);
      }
      return out.join('\n');
    })
    .join('\n\n────\n\n');
}
