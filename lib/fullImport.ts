/**
 * Inverse of lib/fullExport.ts — read a previously-exported JSON file
 * back into localStorage. Together they let the user move their journal
 * between devices manually (export on phone → AirDrop / email → import
 * on laptop). Not as smooth as real cross-device sync, but it requires
 * no backend, no account, no third-party server, and the user's data
 * never leaves their devices.
 *
 * Merge semantics:
 *   - blueprint: incoming wins if present (assume the import is the
 *     freshest source; importing nothing keeps the existing blueprint).
 *   - savedDays: union by dateIso. When both sides have an entry for
 *     the same dateIso, the entry with the higher `savedAt` wins.
 *   - flags: incoming wins for every key that's present.
 *   - attachments (IndexedDB photos / voice notes): NOT included in
 *     JSON exports — they'd bloat the file 100x. Importing on a device
 *     that doesn't already have those blobs results in missing thumbnails;
 *     the entry text and dates remain intact.
 */

import { listSavedDays, type SavedDay } from './savedDays';
import type { Blueprint } from './types';

export interface ImportSummary {
  ok: true;
  /** version of the imported file. */
  version: number;
  /** Number of saved-day entries added to local storage. */
  addedDays: number;
  /** Number of saved-day entries that were updated (newer savedAt). */
  updatedDays: number;
  /** Number of saved-day entries that were skipped (local was newer). */
  skippedDays: number;
  /** Number of partner entries added. */
  addedPartners: number;
  /** Number of partner entries skipped (already had the id). */
  skippedPartners: number;
  /** True if the blueprint was replaced. */
  blueprintReplaced: boolean;
  /** Number of UI flags applied. */
  flagsApplied: number;
}

export type ImportResult = ImportSummary | { ok: false; reason: string };

interface ImportShape {
  version?: unknown;
  blueprint?: unknown;
  savedDays?: unknown;
  flags?: unknown;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export async function importFromFile(file: File): Promise<ImportResult> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, reason: "couldn't read that file." };
  }
  let parsed: ImportShape;
  try {
    parsed = JSON.parse(text) as ImportShape;
  } catch {
    return { ok: false, reason: "that file isn't valid JSON." };
  }
  if (!isPlainObject(parsed)) {
    return { ok: false, reason: 'that JSON is not a Liraydhas export.' };
  }
  if (typeof parsed.version !== 'number') {
    return { ok: false, reason: "couldn't find a version stamp — was this exported from Liraydhas?" };
  }
  if (parsed.version > 1) {
    return {
      ok: false,
      reason: `this export was made by a newer version (v${parsed.version}). Update Liraydhas first.`,
    };
  }

  // Blueprint: replace if present.
  let blueprintReplaced = false;
  if (parsed.blueprint && isPlainObject(parsed.blueprint)) {
    const bp = parsed.blueprint as unknown as Blueprint;
    if (bp.natal && bp.humanDesign && bp.birth) {
      // Persist via the Zustand persist key (matches store.ts).
      try {
        const existing = window.localStorage.getItem('liraydhas-store');
        let s: { state?: Record<string, unknown>; version?: number } = {};
        if (existing) {
          try { s = JSON.parse(existing); } catch {/* ignore */}
        }
        const nextState = { ...(s.state ?? {}), blueprint: bp };
        window.localStorage.setItem(
          'liraydhas-store',
          JSON.stringify({ state: nextState, version: s.version ?? 2 }),
        );
        blueprintReplaced = true;
      } catch (e) {
        console.error('[import] writing blueprint failed', e);
      }
    }
  }

  // Saved days: union by dateIso, newer savedAt wins.
  let addedDays = 0, updatedDays = 0, skippedDays = 0;
  if (Array.isArray(parsed.savedDays)) {
    const local = listSavedDays();
    const byDate = new Map<string, SavedDay>(local.map((d) => [d.dateIso, d]));
    for (const raw of parsed.savedDays) {
      if (!isPlainObject(raw)) continue;
      const d = raw as unknown as SavedDay;
      if (typeof d.dateIso !== 'string' || typeof d.savedAt !== 'number') continue;
      const cur = byDate.get(d.dateIso);
      if (!cur) {
        byDate.set(d.dateIso, d);
        addedDays++;
      } else if (d.savedAt > cur.savedAt) {
        byDate.set(d.dateIso, d);
        updatedDays++;
      } else {
        skippedDays++;
      }
    }
    try {
      window.localStorage.setItem(
        'liraydhas.savedDays.v1',
        JSON.stringify(Array.from(byDate.values())),
      );
    } catch (e) {
      console.error('[import] writing savedDays failed', e);
    }
  }

  // Partners: union by id. Incoming wins on collision (assume the
  // import is the freshest source). Doesn't try to deep-merge — partners
  // are blueprint + name + relation, no fields where merging makes
  // sense.
  let addedPartners = 0, skippedPartners = 0;
  if (Array.isArray(parsed.partners)) {
    try {
      const raw = window.localStorage.getItem('liraydhas.partners.v1');
      const existing: { id?: unknown }[] = raw ? JSON.parse(raw) : [];
      const byId = new Map<string, unknown>();
      for (const p of existing) {
        if (isPlainObject(p) && typeof p.id === 'string') byId.set(p.id, p);
      }
      for (const p of parsed.partners) {
        if (!isPlainObject(p) || typeof p.id !== 'string') continue;
        if (byId.has(p.id)) skippedPartners++;
        else addedPartners++;
        byId.set(p.id, p);
      }
      window.localStorage.setItem(
        'liraydhas.partners.v1',
        JSON.stringify(Array.from(byId.values())),
      );
    } catch (e) {
      console.error('[import] writing partners failed', e);
    }
  }

  // UI flags: incoming wins.
  let flagsApplied = 0;
  if (parsed.flags && isPlainObject(parsed.flags)) {
    for (const [k, v] of Object.entries(parsed.flags)) {
      if (typeof v !== 'string') continue;
      if (!k.startsWith('liraydhas.')) continue;
      try {
        window.localStorage.setItem(k, v);
        flagsApplied++;
      } catch {/* ignore */}
    }
  }

  return {
    ok: true,
    version: parsed.version,
    addedDays,
    updatedDays,
    skippedDays,
    addedPartners,
    skippedPartners,
    blueprintReplaced,
    flagsApplied,
  };
}
