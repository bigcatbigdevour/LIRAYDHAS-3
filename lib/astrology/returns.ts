// Upcoming significant returns.
//
// `daysUntilSolarReturn(natalSunLongitude)` returns the number of days from
// now until the Sun next reaches the natal Sun's ecliptic longitude.

import { planetLongitudeAt, normDeg } from './natal';

export function daysUntilSolarReturn(natalSunLongitude: number, now = new Date()): number {
  const sunNow = planetLongitudeAt('Sun', now);
  // Forward angular distance from current Sun to natal Sun, in [0, 360).
  // Per ~1°/day this approximates the days remaining.
  let forwardDist = normDeg(natalSunLongitude - sunNow);
  if (forwardDist < 0.0005) forwardDist = 360; // exactly on it now → next is a year out
  // Rough days estimate (1°/day average, slightly variable).
  // Search +/- 2 days around the estimate.
  let lo = new Date(now.getTime() + (forwardDist - 3) * 86400_000);
  let hi = new Date(now.getTime() + (forwardDist + 3) * 86400_000);
  // We want sunLon(t) === natalSunLongitude exactly.
  // Define g(t) = sunLon(t) - natalSunLongitude, normalised to (-180, 180].
  // This g is monotonically increasing within our small window because the Sun
  // moves forward at ~1°/day and the window is only 6 days wide.
  function g(d: Date): number {
    let v = planetLongitudeAt('Sun', d) - natalSunLongitude;
    while (v > 180) v -= 360;
    while (v <= -180) v += 360;
    return v;
  }
  let glo = g(lo);
  let ghi = g(hi);
  // If signs are the same, widen by a couple of days; pathological only near new year.
  let widenAttempts = 0;
  while (Math.sign(glo) === Math.sign(ghi) && widenAttempts < 6) {
    lo = new Date(lo.getTime() - 2 * 86400_000);
    hi = new Date(hi.getTime() + 2 * 86400_000);
    glo = g(lo);
    ghi = g(hi);
    widenAttempts++;
  }
  if (Math.sign(glo) === Math.sign(ghi)) {
    return Math.max(0, forwardDist); // best estimate fallback
  }
  // Bisect
  for (let i = 0; i < 40; i++) {
    const mid = new Date((lo.getTime() + hi.getTime()) / 2);
    const gm = g(mid);
    if (Math.abs(gm) < 0.0001) {
      return (mid.getTime() - now.getTime()) / 86400_000;
    }
    if (Math.sign(gm) === Math.sign(glo)) {
      lo = mid; glo = gm;
    } else {
      hi = mid; ghi = gm;
    }
  }
  return (lo.getTime() - now.getTime()) / 86400_000;
}

export function daysSinceLastSolarReturn(natalSunLongitude: number, now = new Date()): number {
  return 365.25 - daysUntilSolarReturn(natalSunLongitude, now);
}
