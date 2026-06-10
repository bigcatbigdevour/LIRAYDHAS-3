/**
 * Whole-app export — blueprint + saved journal + intro/welcome flags —
 * as a single JSON file the user can keep, mail to themselves, or use to
 * verify what the app actually holds on their device.
 *
 * Why: the app's privacy story is "lives in your browser only". That
 * promise carries weight only if the user can SEE what's there and TAKE
 * it with them. Without an export, "lives in your browser only" reads as
 * "you can lose everything by clearing cookies."
 */

import { listSavedDays, type SavedDay } from './savedDays';
import type { Blueprint } from './types';

export interface FullExport {
  /** Format-version stamp so future readers can detect breaking changes. */
  version: 1;
  /** When the export was generated (ISO 8601). */
  exportedAt: string;
  /** Birth + computed chart. May be null if the user hasn't onboarded. */
  blueprint: Blueprint | null;
  /** Every saved-day / journal entry. May be empty. */
  savedDays: SavedDay[];
  /**
   * Non-PII UI flags so re-import / debugging can restore the user's
   * "I've seen this intro" state. Keys are localStorage keys; values are
   * the raw stored string.
   */
  flags: Record<string, string>;
}

/**
 * Build the export from current localStorage state. SSR-safe — returns
 * a minimal stub if window is undefined (shouldn't be called server-side
 * but defensive).
 */
export function buildFullExport(blueprint: Blueprint | null): FullExport {
  const flags: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      // Only liraydhas-namespaced flags. Skip the savedDays key (it's
      // already serialized as `savedDays`) and the blueprint persist key
      // (it's `blueprint`).
      if (
        k &&
        k.startsWith('liraydhas.') &&
        k !== 'liraydhas.savedDays.v1' &&
        !k.startsWith('liraydhas-store')
      ) {
        const v = window.localStorage.getItem(k);
        if (v !== null) flags[k] = v;
      }
    }
  }
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    blueprint,
    savedDays: listSavedDays(),
    flags,
  };
}

/** Suggested filename for the export (timestamped, journal-friendly). */
export function exportFilename(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `liraydhas-${y}-${m}-${day}.json`;
}
