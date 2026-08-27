/**
 * Tracks the user's last-visit timestamp so /today can show a small
 * "what changed since you were here" card on return visits.
 *
 * Why this lever: a daily-use app needs a felt reason to come back. The
 * anniversary card surfaces year-ago entries. This surfaces what shifted
 * RECENTLY — a polarity flip you missed, a chapter you stepped into, a
 * lunation that happened — so the app feels like it's been watching the
 * sky for you while you were away.
 *
 * Stored as an ISO timestamp in localStorage. The lookup is the calling
 * page's responsibility: it reads, computes what's new, writes the
 * current time, and renders the card if anything notable happened.
 */

const KEY = 'liraydhas.lastVisit.v1';

/** Read the previous visit timestamp, or null if first time. */
export function getLastVisit(): Date | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const t = Date.parse(raw);
    if (Number.isNaN(t)) return null;
    return new Date(t);
  } catch {
    // iOS Private Browsing throws on localStorage access. Treat as
    // "first visit" rather than crashing the /today render.
    return null;
  }
}

/** Mark the current visit. Call AFTER you've computed anything that
 *  depended on the previous value. */
export function markVisited(now: Date = new Date()): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, now.toISOString());
  } catch { /* ignore quota / private-browsing */ }
}

/**
 * Compute human-readable "what changed" since `since`. Returns a list of
 * one-line bits, voice-matched. Empty list if nothing notable happened.
 */
export interface ChangedBit {
  /** Short caps prefix for the line, e.g. "TIDE" / "MOON" / "CHAPTER". */
  kind: string;
  /** The one-line description. */
  text: string;
}

import { polarityFlips, ageInYears } from './cycles';
import { currentChapter } from './lifeChapters';

export function changesSince(
  birthIso: string,
  since: Date,
  now: Date = new Date(),
): ChangedBit[] {
  const out: ChangedBit[] = [];
  const sinceMs = since.getTime();
  const nowMs = now.getTime();
  const sinceAge = ageInYears(birthIso, since);
  const nowAge = ageInYears(birthIso, now);

  // Polarity flips that happened in the gap (and aren't more than 30
  // days old — even a long absence shouldn't surface 8-month-old flips).
  const flips = polarityFlips(birthIso, now);
  const horizonMs = 45 * 86400_000;
  for (const f of flips) {
    const flipMs = f.startedAt.getTime();
    if (flipMs > sinceMs && flipMs <= nowMs && nowMs - flipMs <= horizonMs) {
      out.push({
        kind: 'TIDE',
        text: `${f.cycle.label.toLowerCase()} flipped to ${f.positive ? 'rising' : 'descending'}`,
      });
    }
  }

  // Crossed into a new life chapter while away.
  const sinceChapter = currentChapter(sinceAge);
  const nowChapter = currentChapter(nowAge);
  if (sinceChapter?.label !== nowChapter?.label) {
    if (nowChapter) {
      out.push({
        kind: 'CHAPTER',
        text: `you stepped into ${nowChapter.label.toLowerCase()}`,
      });
    }
  }

  return out;
}

/** Pretty human gap label like "yesterday" / "3 days ago" / "two weeks ago". */
export function prettyGap(since: Date, now: Date = new Date()): string {
  const ms = now.getTime() - since.getTime();
  const days = Math.floor(ms / 86400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'a week ago';
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return 'a month ago';
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  if (days < 730) return 'a year ago';
  return `${Math.floor(days / 365)} years ago`;
}
