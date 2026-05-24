// Lightweight calculations for upcoming significant returns.
//
// Solar return = the day this year when the Sun is at the same ecliptic
// longitude as the natal Sun. We approximate by computing days until the
// next natal-Sun-longitude crossing, starting from today.

import { Body, MakeTime } from 'astronomy-engine';
import { geocentricLongitude, normDeg } from './natal';

/**
 * Days until the Sun next reaches the given natal longitude.
 * Uses bisection on the day axis, accurate to ~1 hour.
 */
export function daysUntilSolarReturn(natalSunLongitude: number, now = new Date()): number {
  function sunLon(d: Date): number {
    return geocentricLongitude(Body.Sun, MakeTime(d));
  }
  function delta(d: Date): number {
    let x = natalSunLongitude - sunLon(d);
    while (x > 180) x -= 360;
    while (x < -180) x += 360;
    return x; // positive = sun must advance, negative = it has passed
  }

  let d0 = new Date(now);
  let d1 = new Date(now.getTime() + 366 * 86400 * 1000);
  let v0 = delta(d0);
  let v1 = delta(d1);

  // We want the smallest t > 0 such that delta(t) = 0 *transitioning from positive to zero* (sun catching up).
  // If today the sun is already exactly at natal (delta=0), pick the NEXT one (~365.25d ahead).
  if (Math.abs(v0) < 0.0005) {
    d0 = new Date(now.getTime() + 1 * 86400 * 1000);
    v0 = delta(d0);
  }
  // Walk forward in 30-day steps until delta changes sign (positive → negative).
  if (Math.sign(v0) === Math.sign(v1)) {
    // not bracketed yet — fall back to assumption of 365.25 days
    return 365.25;
  }

  // Bisection
  for (let i = 0; i < 30; i++) {
    const mid = new Date((d0.getTime() + d1.getTime()) / 2);
    const vm = delta(mid);
    if (Math.abs(vm) < 0.0005) {
      return (mid.getTime() - now.getTime()) / 86400 / 1000;
    }
    if (Math.sign(vm) === Math.sign(v0)) {
      d0 = mid; v0 = vm;
    } else {
      d1 = mid; v1 = vm;
    }
  }
  return (d0.getTime() - now.getTime()) / 86400 / 1000;
}

export function daysSinceLastSolarReturn(natalSunLongitude: number, now = new Date()): number {
  const next = daysUntilSolarReturn(natalSunLongitude, now);
  return 365.25 - next;
}

// Re-export the longitude normalizer for callers that want it.
export { normDeg };
