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
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const lookup: Record<string, string> = {};
  for (const p of parts) lookup[p.type] = p.value;
  const asUtc = Date.UTC(
    Number(lookup.year),
    Number(lookup.month) - 1,
    Number(lookup.day),
    Number(lookup.hour === '24' ? 0 : lookup.hour),
    Number(lookup.minute),
    Number(lookup.second),
  );
  return Math.round((asUtc - date.getTime()) / 60_000);
}
