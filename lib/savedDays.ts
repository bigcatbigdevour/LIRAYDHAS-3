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
  /** The LLM-generated paragraph that was on screen when saved. */
  paragraph: string;
  /** Tightest transit label, e.g. "Saturn square Sun" — for the list view. */
  headline?: string;
  /** Optional free-text note the user wrote when saving. */
  note?: string;
  /** Epoch ms the entry was created. */
  savedAt: number;
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

export function saveDay(entry: SavedDay): void {
  const list = read().filter((d) => d.dateIso !== entry.dateIso);
  list.push(entry);
  write(list);
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
