// Determine which house a longitude falls into, given the 12 cusps.

/**
 * Houses are 1..12, indexed by which cusp the longitude is *past*.
 * Cusps array is in zodiacal order starting with cusp 1 = ASC.
 */
export function houseOfLongitude(
  lon: number,
  cusps: (number | null)[],
): number | null {
  if (cusps.some((c) => c === null)) return null;
  const c = cusps as number[];
  const n = ((lon % 360) + 360) % 360;
  // For each house i, check if n is in [c[i], c[i+1]) going forward in zodiac.
  for (let i = 0; i < 12; i++) {
    const a = c[i];
    const b = c[(i + 1) % 12];
    if (a <= b) {
      if (n >= a && n < b) return i + 1;
    } else {
      // wraps past 0°
      if (n >= a || n < b) return i + 1;
    }
  }
  return null;
}
