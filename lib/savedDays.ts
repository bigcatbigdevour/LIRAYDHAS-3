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
   * If true, this entry surfaces in the "Pinned" section at the top of
   * /saved and shows a star in the heatmap. The user is telling the app
   * "I want to find this one again." Independent of save/note state.
   */
  pinned?: boolean;
  /**
   * Optional tags (single words, lowercase) — picked from a fixed palette
   * defined in lib/tags.ts. Capped at 3 per entry to keep the journal
   * scannable. Stored as a deduped array; renderers should not assume
   * presence.
   */
  tags?: string[];
  /**
   * Attachment ids for photos pinned to this entry. The blobs themselves
   * live in IndexedDB (see lib/attachments.ts); this array carries only
   * the keys so the journal export, search, and cross-tab sync stay
   * lightweight. Capped at 4 photos per entry — beyond that the journal
   * stops being a journal and starts being a photo roll.
   */
  photoIds?: string[];
  /**
   * Attachment ids for voice notes pinned to this entry. Same IndexedDB
   * storage as photos; same cap rationale. A voice note is a quick
   * audio capture (MediaRecorder; webm/opus by default in Chromium and
   * audio/mp4 in Safari) that lives next to the written note.
   */
  audioIds?: string[];
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
    return parsed
      .filter(
        (x): x is SavedDay =>
          typeof x === 'object' && x !== null &&
          typeof (x as SavedDay).dateIso === 'string' &&
          typeof (x as SavedDay).paragraph === 'string' &&
          typeof (x as SavedDay).savedAt === 'number',
      )
      .map((x) => {
        // Normalize legacy data: defensively drop empty-string notes
        // (older writes stored '' instead of undefined), validate
        // snapshot shape (a malformed snapshot would crash downstream
        // at .toFixed / .toLowerCase calls), and clean tags arrays.
        const noteTrim = typeof x.note === 'string' ? x.note.trim() : '';
        const snap = x.snapshot && typeof x.snapshot === 'object' ? x.snapshot : undefined;
        const rawTags = Array.isArray(x.tags) ? x.tags : [];
        const cleanTags = Array.from(
          new Set(
            rawTags
              .filter((t): t is string => typeof t === 'string')
              .map((t) => t.trim().toLowerCase())
              .filter((t) => t.length > 0),
          ),
        ).slice(0, 3);
        const rawPhotos = Array.isArray(x.photoIds) ? x.photoIds : [];
        const cleanPhotos = rawPhotos
          .filter((p): p is string => typeof p === 'string' && p.length > 0)
          .slice(0, 4);
        const rawAudio = Array.isArray(x.audioIds) ? x.audioIds : [];
        const cleanAudio = rawAudio
          .filter((p): p is string => typeof p === 'string' && p.length > 0)
          .slice(0, 4);
        return {
          ...x,
          note: noteTrim.length > 0 ? noteTrim : undefined,
          snapshot: snap,
          tags: cleanTags.length > 0 ? cleanTags : undefined,
          photoIds: cleanPhotos.length > 0 ? cleanPhotos : undefined,
          audioIds: cleanAudio.length > 0 ? cleanAudio : undefined,
        };
      });
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
 * left them blank. Snapshot is merged field-by-field.
 */
export function saveDay(entry: SavedDay): void {
  const list = read();
  const existing = list.find((d) => d.dateIso === entry.dateIso);
  // Field-by-field snapshot merge: SaveDayButton always passes a snapshot
  // OBJECT, but some of its fields may be undefined (e.g. moon failed to
  // load on a cold start). Naive `entry.snapshot ?? existing.snapshot`
  // would let a half-populated snapshot clobber a previously good one.
  const mergedSnapshot = existing?.snapshot || entry.snapshot
    ? {
        moonPhase: entry.snapshot?.moonPhase ?? existing?.snapshot?.moonPhase,
        moonSign: entry.snapshot?.moonSign ?? existing?.snapshot?.moonSign,
        chapter: entry.snapshot?.chapter ?? existing?.snapshot?.chapter,
        ageYears: entry.snapshot?.ageYears ?? existing?.snapshot?.ageYears,
      }
    : undefined;
  const merged: SavedDay = existing
    ? {
        dateIso: entry.dateIso,
        paragraph: entry.paragraph || existing.paragraph,
        headline: entry.headline ?? existing.headline,
        note: entry.note ?? existing.note,
        pinned: entry.pinned ?? existing.pinned,
        tags: entry.tags ?? existing.tags,
        photoIds: entry.photoIds ?? existing.photoIds,
        audioIds: entry.audioIds ?? existing.audioIds,
        snapshot: mergedSnapshot,
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
  // Treat empty / whitespace-only as "no note" so the "with notes" count
  // and `existingNote` UI checks stay consistent. Otherwise updating to
  // '' would silently keep the entry counted as noted.
  const cleaned = note.trim();
  list[i] = { ...list[i], note: cleaned.length > 0 ? cleaned : undefined };
  write(list);
}

/**
 * Append a new timestamped moment to an entry's note. Each appended block
 * is preceded by a divider like "— 4:32 pm —" so the chronology stays
 * legible. Creates the entry if it doesn't exist yet.
 *
 * Why this instead of allowing multiple entries per day: the user already
 * sees the pattern with the round-111 reflection nudge ("— later (4:32 pm) —").
 * Extending it gives "multi-moment per day" journaling without a schema
 * migration, without breaking pin/tag/anchor semantics, and without
 * proliferating entries that all share the same date headline.
 */
export function appendMoment(
  dateIso: string,
  moment: string,
  now: Date = new Date(),
): void {
  const text = moment.trim();
  if (!text) return;
  const stamp = now.toLocaleTimeString(undefined, {
    hour: 'numeric', minute: '2-digit',
  });
  const list = read();
  const i = list.findIndex((d) => d.dateIso === dateIso);
  if (i < 0) {
    // No entry yet — create one as a pure journal entry.
    list.push({
      dateIso,
      paragraph: '',
      note: `— ${stamp} —\n${text}`,
      savedAt: now.getTime(),
    });
  } else {
    const existing = list[i].note?.trim() ?? '';
    const block = `— ${stamp} —\n${text}`;
    const next = existing.length > 0 ? `${existing}\n\n${block}` : block;
    list[i] = { ...list[i], note: next };
  }
  write(list);
}

export const MAX_PHOTOS_PER_ENTRY = 4;

/**
 * Attach an already-stored attachment id to an entry. Caps at 4 photos
 * per entry. Creates the entry as a pure journal entry if it doesn't
 * exist yet.
 */
export function attachPhoto(dateIso: string, photoId: string): void {
  const list = read();
  const i = list.findIndex((d) => d.dateIso === dateIso);
  if (i < 0) {
    list.push({
      dateIso,
      paragraph: '',
      photoIds: [photoId],
      savedAt: Date.now(),
    });
  } else {
    const cur = list[i].photoIds ?? [];
    if (cur.length >= MAX_PHOTOS_PER_ENTRY) return;
    if (cur.includes(photoId)) return;
    list[i] = { ...list[i], photoIds: [...cur, photoId] };
  }
  write(list);
}

/** Detach a photo id from an entry. The caller should also delete the
 *  blob from IndexedDB if no other entry references it. */
export function detachPhoto(dateIso: string, photoId: string): void {
  const list = read();
  const i = list.findIndex((d) => d.dateIso === dateIso);
  if (i < 0) return;
  const cur = list[i].photoIds ?? [];
  const next = cur.filter((p) => p !== photoId);
  list[i] = { ...list[i], photoIds: next.length > 0 ? next : undefined };
  write(list);
}

export const MAX_AUDIO_PER_ENTRY = 4;

export function attachAudio(dateIso: string, audioId: string): void {
  const list = read();
  const i = list.findIndex((d) => d.dateIso === dateIso);
  if (i < 0) {
    list.push({
      dateIso,
      paragraph: '',
      audioIds: [audioId],
      savedAt: Date.now(),
    });
  } else {
    const cur = list[i].audioIds ?? [];
    if (cur.length >= MAX_AUDIO_PER_ENTRY) return;
    if (cur.includes(audioId)) return;
    list[i] = { ...list[i], audioIds: [...cur, audioId] };
  }
  write(list);
}

export function detachAudio(dateIso: string, audioId: string): void {
  const list = read();
  const i = list.findIndex((d) => d.dateIso === dateIso);
  if (i < 0) return;
  const cur = list[i].audioIds ?? [];
  const next = cur.filter((p) => p !== audioId);
  list[i] = { ...list[i], audioIds: next.length > 0 ? next : undefined };
  write(list);
}

/** Toggle the pin flag on an entry. No-op if the entry doesn't exist. */
export function togglePin(dateIso: string): void {
  const list = read();
  const i = list.findIndex((d) => d.dateIso === dateIso);
  if (i < 0) return;
  list[i] = { ...list[i], pinned: !list[i].pinned };
  write(list);
}

/**
 * Toggle a tag on an entry. Stores normalized (trim+lower), dedupes, and
 * caps the tag count so an over-eager tapper can't bloat an entry into
 * an unreadable wall of chips.
 */
export const MAX_TAGS_PER_ENTRY = 3;
export function toggleTag(dateIso: string, tag: string): void {
  const list = read();
  const i = list.findIndex((d) => d.dateIso === dateIso);
  if (i < 0) return;
  const t = tag.trim().toLowerCase();
  if (!t) return;
  const cur = (list[i].tags ?? []).slice();
  const at = cur.indexOf(t);
  if (at >= 0) {
    cur.splice(at, 1);
  } else if (cur.length < MAX_TAGS_PER_ENTRY) {
    cur.push(t);
  } else {
    // At cap — silently no-op rather than mutate. UI should warn.
    return;
  }
  list[i] = { ...list[i], tags: cur.length > 0 ? cur : undefined };
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
    const tagText = (d.tags ?? []).join(' ');
    const hay = `${d.paragraph} ${d.note ?? ''} ${d.headline ?? ''} ${tagText}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}

/**
 * Pick the best anniversary across all year-offsets up to `maxYearsAgo`,
 * preferring the SMALLEST day-distance — not the most recent year.
 * Otherwise an exact-match entry from 5 years ago is silently shadowed by
 * a 3-days-off entry from 1 year ago, which is the wrong vibe: the
 * exact-date hit is the more poignant journal echo.
 *
 * Tie-break: when two entries are equally close in days, prefer the more
 * recent year (smaller yearsAgo) — "a year ago today" beats "five years
 * ago today" when both are exact, because recency feels more relevant.
 */
export function bestAnniversary(
  now: Date = new Date(),
  maxYearsAgo = 5,
): { yearsAgo: number; day: SavedDay; distDays: number } | null {
  // Read once, not once-per-year; localStorage is cheap but the JSON
  // parse + normalization is not free either.
  const list = read();
  if (list.length === 0) return null;
  let best: { yearsAgo: number; day: SavedDay; distDays: number } | null = null;
  for (let n = 1; n <= maxYearsAgo; n++) {
    const target = new Date(now);
    target.setFullYear(target.getFullYear() - n);
    for (const d of list) {
      const dt = new Date(d.dateIso + 'T12:00:00');
      const distDays = Math.abs(dt.getTime() - target.getTime()) / 86400_000;
      if (distDays > 3) continue;
      if (
        best === null ||
        distDays < best.distDays ||
        (distDays === best.distDays && n < best.yearsAgo)
      ) {
        best = { yearsAgo: n, day: d, distDays };
      }
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
