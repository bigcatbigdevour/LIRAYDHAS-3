// Resolve a (lat, lon) to its IANA timezone, then build a UTC Date from a
// local-civil datetime in that zone.

import tzlookup from 'tz-lookup';

export function tzFromLatLon(lat: number, lon: number): string {
  try {
    return tzlookup(lat, lon);
  } catch {
    // tz-lookup may throw at exact poles or invalid inputs.
    return 'UTC';
  }
}

/**
 * Convert "YYYY-MM-DDTHH:mm" interpreted as local time in `tz` → UTC Date.
 *
 * Uses Intl.DateTimeFormat to get the UTC offset at that local civil time, then
 * subtracts it. This is the canonical "civil → instant" conversion without
 * pulling in a heavyweight tz library.
 */
export function localCivilToUtc(localIso: string, tz: string): Date {
  // localIso is like "1955-02-24T19:15" (no zone). Treat each field as-given.
  const m = localIso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) throw new Error(`Bad local datetime "${localIso}"`);
  const [, ys, mos, ds, hs, mins, ss] = m;
  const y = Number(ys);
  const mo = Number(mos);
  const d = Number(ds);
  const h = Number(hs);
  const mi = Number(mins);
  const se = ss ? Number(ss) : 0;
  // Initial guess: treat fields as UTC.
  const guess = new Date(Date.UTC(y, mo - 1, d, h, mi, se));
  // Determine the wall-clock time of `guess` AS RENDERED IN `tz`.
  const offsetMin = tzOffsetMinutes(guess, tz);
  // Real UTC = guess - offset
  const corrected = new Date(guess.getTime() - offsetMin * 60_000);
  // Re-check around DST boundaries:
  const offset2 = tzOffsetMinutes(corrected, tz);
  if (offset2 !== offsetMin) {
    return new Date(guess.getTime() - offset2 * 60_000);
  }
  return corrected;
}

/** UTC offset of `tz` at instant `date`, in minutes east of UTC. */
export function tzOffsetMinutes(date: Date, tz: string): number {
  // Intl.DateTimeFormat throws RangeError on a malformed timezone
  // identifier. tzFromLatLon falls back to 'UTC' for unknown inputs,
  // but a future tz-lookup change could leak a bad string through —
  // fall back to UTC (offset 0) rather than crashing.
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).formatToParts(date);
  } catch {
    return 0;
  }
  const lookup: Record<string, string> = {};
  for (const p of parts) lookup[p.type] = p.value;
  // formatToParts should always return year/month/day/hour/minute/second,
  // but guard the Number() coercions defensively — a missing field would
  // become NaN and silently corrupt every downstream age / chart calc.
  const y = Number(lookup.year);
  const mo = Number(lookup.month);
  const d = Number(lookup.day);
  const h = Number(lookup.hour === '24' ? 0 : lookup.hour);
  const mi = Number(lookup.minute);
  const se = Number(lookup.second);
  if ([y, mo, d, h, mi, se].some((n) => !Number.isFinite(n))) return 0;
  const asUtc = Date.UTC(y, mo - 1, d, h, mi, se);
  return Math.round((asUtc - date.getTime()) / 60_000);
}
