/**
 * Partner storage — localStorage-only, single-device (same model as
 * the journal).
 *
 * "Partner" is a deliberately neutral word: anyone whose chart the user
 * wants alongside their own. Spouse, child, parent, best friend, ex,
 * boss. The compatibility view shows how the two charts meet AND where
 * each person is in their own life cycle at the same moment.
 */

import type { Blueprint } from './types';

export interface SavedPartner {
  /** Stable id — uuid-ish. */
  id: string;
  /** Display name. */
  name: string;
  /** Full computed blueprint for the partner. */
  blueprint: Blueprint;
  /** Epoch ms when added. */
  addedAt: number;
  /** Optional relationship label ("partner", "child", "friend", "boss"). */
  relation?: string;
  /** Optional free-text note about the relationship. */
  note?: string;
}

const KEY = 'liraydhas.partners.v1';

function newId(): string {
  // Cryptographically-random short id, just long enough to be unique
  // within the user's small partner list (10-20 partners tops).
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'p_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function read(): SavedPartner[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is SavedPartner =>
        typeof x === 'object' && x !== null &&
        typeof (x as SavedPartner).id === 'string' &&
        typeof (x as SavedPartner).name === 'string' &&
        typeof (x as SavedPartner).addedAt === 'number' &&
        (x as SavedPartner).blueprint != null,
    );
  } catch {
    return [];
  }
}

function write(list: SavedPartner[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
}

export function listPartners(): SavedPartner[] {
  return read().sort((a, b) => b.addedAt - a.addedAt);
}

export function getPartner(id: string): SavedPartner | null {
  return read().find((p) => p.id === id) ?? null;
}

export function addPartner(
  partner: Omit<SavedPartner, 'id' | 'addedAt'>,
): SavedPartner {
  const full: SavedPartner = {
    ...partner,
    id: newId(),
    addedAt: Date.now(),
  };
  write([full, ...read()]);
  return full;
}

export function updatePartner(id: string, patch: Partial<SavedPartner>): void {
  const list = read();
  const i = list.findIndex((p) => p.id === id);
  if (i < 0) return;
  list[i] = { ...list[i], ...patch, id: list[i].id };
  write(list);
}

export function removePartner(id: string): void {
  write(read().filter((p) => p.id !== id));
}
