// Natal chart calculations using astronomy-engine.
// All longitudes are tropical ecliptic, in degrees [0, 360).

import {
  Body,
  AstroTime,
  MakeTime,
  GeoVector,
  Ecliptic,
  SiderealTime,
} from 'astronomy-engine';
import type {
  NatalChart,
  PlanetPos,
  ZodiacSign,
} from '../types';
import { longitudeToGateLine } from '../humandesign/gateWheel';

const SIGNS: ZodiacSign[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

export function normDeg(x: number): number {
  let v = x % 360;
  if (v < 0) v += 360;
  return v;
}

export function toTime(date: Date): AstroTime {
  return MakeTime(date);
}

/** Geocentric apparent tropical ecliptic longitude for an astronomy-engine Body. */
export function geocentricLongitude(body: Body, time: AstroTime): number {
  const vec = GeoVector(body, time, true);
  const ecl = Ecliptic(vec);
  return normDeg(ecl.elon);
}

/** Compute geocentric ecliptic longitude for a named planet at a given date. Convenience for tests. */
export function planetLongitudeAt(planet: 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn' | 'Uranus' | 'Neptune' | 'Pluto', date: Date): number {
  const body: Record<string, Body> = {
    Sun: Body.Sun, Moon: Body.Moon, Mercury: Body.Mercury, Venus: Body.Venus,
    Mars: Body.Mars, Jupiter: Body.Jupiter, Saturn: Body.Saturn,
    Uranus: Body.Uranus, Neptune: Body.Neptune, Pluto: Body.Pluto,
  };
  return geocentricLongitude(body[planet], MakeTime(date));
}

export function nodeAt(date: Date): number {
  return meanNorthNode(MakeTime(date));
}

/** Mean lunar north node (Meeus / NASA). */
export function meanNorthNode(time: AstroTime): number {
  // T = Julian centuries from J2000.0
  const T = (time.tt) / 36525;
  return normDeg(125.04452 - 1934.136261 * T);
}

/**
 * Chiron longitude: a low-precision Keplerian approximation.
 * Source: orbital elements ~epoch 2000, accurate to ~1° over decades — fine
 * for our v1 display (the user can opt out with a TODO if even that is too much).
 */
export function chironLongitude(time: AstroTime): number | null {
  // Elements (J2000.0): a=13.708 AU, e=0.3831, i=6.93°, Ω=209.36°, ω=339.42°, M0=110.04°
  // Period ~50.42 years.
  const a = 13.708;
  const e = 0.3831;
  const iDeg = 6.93;
  const OmegaDeg = 209.36;
  const omegaDeg = 339.42;
  const M0Deg = 110.04;
  const periodYears = 50.42;

  // Days since J2000
  const daysSinceJ2000 = time.tt; // AstroTime.tt is days since J2000 TT
  const yearsSinceJ2000 = daysSinceJ2000 / 365.25;
  const n = 360 / periodYears; // mean motion, deg/year
  const M = normDeg(M0Deg + n * yearsSinceJ2000);
  // Solve Kepler's equation for E
  const Mrad = (M * Math.PI) / 180;
  let E = Mrad;
  for (let i = 0; i < 12; i++) {
    E = E - (E - e * Math.sin(E) - Mrad) / (1 - e * Math.cos(E));
  }
  // True anomaly
  const nu = 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2),
  );
  // Heliocentric ecliptic coords (in orbital plane)
  const r = a * (1 - e * Math.cos(E));
  const xOrb = r * Math.cos(nu);
  const yOrb = r * Math.sin(nu);

  const omega = (omegaDeg * Math.PI) / 180;
  const Omega = (OmegaDeg * Math.PI) / 180;
  const inc = (iDeg * Math.PI) / 180;

  const xH =
    (Math.cos(omega) * Math.cos(Omega) - Math.sin(omega) * Math.sin(Omega) * Math.cos(inc)) * xOrb +
    (-Math.sin(omega) * Math.cos(Omega) - Math.cos(omega) * Math.sin(Omega) * Math.cos(inc)) * yOrb;
  const yH =
    (Math.cos(omega) * Math.sin(Omega) + Math.sin(omega) * Math.cos(Omega) * Math.cos(inc)) * xOrb +
    (-Math.sin(omega) * Math.sin(Omega) + Math.cos(omega) * Math.cos(Omega) * Math.cos(inc)) * yOrb;
  const zH = Math.sin(omega) * Math.sin(inc) * xOrb + Math.cos(omega) * Math.sin(inc) * yOrb;

  // Get Earth's heliocentric vector via astronomy-engine for the same instant.
  // HelioVector(Earth) gives Earth's helio position; subtract to get geocentric.
  const earthVec = GeoVector(Body.Sun, time, false); // Sun-from-Earth → negate for Earth-from-Sun
  // Note: GeoVector returns the vector FROM Earth TO Sun, so Earth-from-Sun = -GeoVector(Sun)
  const xE = -earthVec.x;
  const yE = -earthVec.y;
  const zE = -earthVec.z;

  // Geocentric: Chiron - Earth
  const xG = xH - xE;
  const yG = yH - yE;
  const zG = zH - zE;

  const lonRad = Math.atan2(yG, xG);
  const lonDeg = normDeg((lonRad * 180) / Math.PI);
  return lonDeg;
}

export function signFromLongitude(lon: number): ZodiacSign {
  const n = normDeg(lon);
  return SIGNS[Math.floor(n / 30)];
}

export function degreeInSign(lon: number): number {
  return normDeg(lon) % 30;
}

export function makePlanetPos(longitude: number): PlanetPos {
  const lon = normDeg(longitude);
  const { gate, line } = longitudeToGateLine(lon);
  return {
    longitude: lon,
    sign: signFromLongitude(lon),
    degree: degreeInSign(lon),
    gate,
    line,
  };
}

/** Mean obliquity of the ecliptic (degrees) at given AstroTime, IAU 2006. */
function obliquity(time: AstroTime): number {
  const T = time.tt / 36525;
  const epsArcsec =
    84381.406 - 46.836769 * T - 0.0001831 * T * T + 0.00200340 * T * T * T;
  return epsArcsec / 3600;
}

/** Apparent local sidereal time in degrees [0, 360). */
function localSiderealTime(time: AstroTime, lonDeg: number): number {
  // SiderealTime returns Greenwich apparent sidereal time in hours.
  const gstHours = SiderealTime(time);
  const lstHours = gstHours + lonDeg / 15;
  return normDeg(lstHours * 15);
}

/** Ascendant (rising-sign longitude). Standard spherical formula. */
function ascendant(time: AstroTime, latDeg: number, lonDeg: number): number {
  const epsRad = (obliquity(time) * Math.PI) / 180;
  const lstRad = (localSiderealTime(time, lonDeg) * Math.PI) / 180;
  const latRad = (latDeg * Math.PI) / 180;
  // λ_asc = atan2(cos(RAMC), -sin(RAMC)·cos(ε) - tan(φ)·sin(ε))
  // (the other branch of atan2 gives the descendant; the version with all
  // signs flipped here picks the *rising* ecliptic point.)
  const y = Math.cos(lstRad);
  const x = -Math.sin(lstRad) * Math.cos(epsRad) - Math.tan(latRad) * Math.sin(epsRad);
  const asc = Math.atan2(y, x);
  return normDeg((asc * 180) / Math.PI);
}

/** MC (Midheaven). */
function midheaven(time: AstroTime, lonDeg: number): number {
  const epsRad = (obliquity(time) * Math.PI) / 180;
  const lstRad = (localSiderealTime(time, lonDeg) * Math.PI) / 180;
  const mc = Math.atan2(Math.sin(lstRad), Math.cos(lstRad) * Math.cos(epsRad));
  return normDeg((mc * 180) / Math.PI);
}

/**
 * Placidus house cusps via iterative semi-arc method.
 *
 * For each intermediate cusp (11, 12, 2, 3) we iterate on the hour angle
 * until it matches F·SA (above horizon) or SA + (180−SA)·(1−F) (below
 * horizon), where F is the cusp's fraction of its semi-arc and SA depends
 * on the cusp's declination — which itself depends on the cusp's longitude.
 *
 * Cusps 5, 6, 8, 9 are the 180° opposites of 11, 12, 2, 3.
 * Cusp 1 = ASC, cusp 7 = ASC+180°, cusp 10 = MC, cusp 4 = MC+180°.
 *
 * Above geographic latitude ~66° Placidus breaks down (circumpolar
 * declinations) — we return all-null cusps for callers to fall back to
 * equal house.
 */
export function placidusHouses(
  time: AstroTime,
  latDeg: number,
  lonDeg: number,
): (number | null)[] {
  if (Math.abs(latDeg) > 66) return Array(12).fill(null);

  const RAD = Math.PI / 180;
  const eps = obliquity(time);
  const epsRad = eps * RAD;
  const ramcDeg = localSiderealTime(time, lonDeg);
  const phi = latDeg * RAD;
  const asc = ascendant(time, latDeg, lonDeg);
  const mc = midheaven(time, lonDeg);

  function cuspIntermediate(houseNum: 11 | 12 | 2 | 3): number | null {
    let F: number;
    let isNight: boolean;
    let initialHA: number;
    switch (houseNum) {
      case 11: F = 1 / 3; isNight = false; initialHA = 30;  break;
      case 12: F = 2 / 3; isNight = false; initialHA = 60;  break;
      case 2:  F = 2 / 3; isNight = true;  initialHA = 120; break;
      case 3:  F = 1 / 3; isNight = true;  initialHA = 150; break;
    }

    let HA = initialHA;
    for (let iter = 0; iter < 30; iter++) {
      const RArad = (ramcDeg + HA) * RAD;
      // On-ecliptic longitude for this RA (β=0): atan2(sin α, cos α · cos ε)
      const lam = Math.atan2(Math.sin(RArad), Math.cos(RArad) * Math.cos(epsRad));
      const dec = Math.asin(Math.sin(epsRad) * Math.sin(lam));
      const cosSA = -Math.tan(phi) * Math.tan(dec);
      if (cosSA < -1 || cosSA > 1) return null; // circumpolar
      const SA = Math.acos(cosSA) / RAD;
      // Above horizon: cusp 11 at F=1/3 of SA east of MC; cusp 12 at F=2/3
      // Below horizon: cusp at SA + (180−SA)·(1−F') from MC, where F' is the
      // fraction toward IC. For cusp 2 (F=2/3, closer to ASC), the formula
      // simplifies to (180 + 2·SA)/3; for cusp 3 (F=1/3, closer to IC), to
      // (SA + 360)/3.
      let newHA: number;
      if (!isNight) {
        newHA = F * SA;
      } else if (houseNum === 2) {
        newHA = (180 + 2 * SA) / 3;
      } else {
        newHA = (SA + 360) / 3;
      }
      if (Math.abs(newHA - HA) < 1e-7) {
        HA = newHA;
        break;
      }
      HA = newHA;
    }
    const RArad = (ramcDeg + HA) * RAD;
    const lam = Math.atan2(Math.sin(RArad), Math.cos(RArad) * Math.cos(epsRad));
    return normDeg((lam * 180) / Math.PI);
  }

  const c11 = cuspIntermediate(11);
  const c12 = cuspIntermediate(12);
  const c2  = cuspIntermediate(2);
  const c3  = cuspIntermediate(3);

  if (c11 === null || c12 === null || c2 === null || c3 === null) {
    return Array(12).fill(null);
  }

  // 12 cusps in zodiacal order: 1 .. 12
  return [
    asc,                  // 1
    c2,                   // 2
    c3,                   // 3
    normDeg(mc + 180),    // 4 = IC
    normDeg(c11 + 180),   // 5
    normDeg(c12 + 180),   // 6
    normDeg(asc + 180),   // 7 = DSC
    normDeg(c2 + 180),    // 8
    normDeg(c3 + 180),    // 9
    mc,                   // 10
    c11,                  // 11
    c12,                  // 12
  ];
}

/**
 * Equal-house cusps. Used as a fallback when Placidus can't be computed
 * (polar latitudes) or when the caller wants a simpler division.
 */
export function equalHouses(
  time: AstroTime,
  latDeg: number,
  lonDeg: number,
): (number | null)[] {
  if (Math.abs(latDeg) > 85) return Array(12).fill(null);
  const asc = ascendant(time, latDeg, lonDeg);
  return Array.from({ length: 12 }, (_, i) => normDeg(asc + 30 * i));
}

/**
 * Default cusps: Placidus when latitude < 66°, else equal as fallback.
 * Used by computeNatal().
 */
export function houseCusps(
  time: AstroTime,
  latDeg: number,
  lonDeg: number,
): (number | null)[] {
  const p = placidusHouses(time, latDeg, lonDeg);
  if (p.every((c) => c !== null)) return p;
  return equalHouses(time, latDeg, lonDeg);
}

export interface ComputeNatalArgs {
  utc: Date;
  lat: number;
  lon: number;
  timeUnknown: boolean;
}

/** All major planet longitudes at a given UTC moment + houses if time is known. */
export function computeNatal(args: ComputeNatalArgs): NatalChart {
  const time = toTime(args.utc);

  const lonOf = (body: Body) => geocentricLongitude(body, time);

  const sun = lonOf(Body.Sun);
  const moon = lonOf(Body.Moon);
  const mercury = lonOf(Body.Mercury);
  const venus = lonOf(Body.Venus);
  const mars = lonOf(Body.Mars);
  const jupiter = lonOf(Body.Jupiter);
  const saturn = lonOf(Body.Saturn);
  const uranus = lonOf(Body.Uranus);
  const neptune = lonOf(Body.Neptune);
  const pluto = lonOf(Body.Pluto);
  const nn = meanNorthNode(time);
  const chiron = chironLongitude(time);

  let asc: number | null = null;
  let mc: number | null = null;
  let houses: (number | null)[] = Array(12).fill(null);
  if (!args.timeUnknown) {
    asc = ascendant(time, args.lat, args.lon);
    mc = midheaven(time, args.lon);
    houses = houseCusps(time, args.lat, args.lon);
  }

  return {
    sun: makePlanetPos(sun),
    moon: makePlanetPos(moon),
    mercury: makePlanetPos(mercury),
    venus: makePlanetPos(venus),
    mars: makePlanetPos(mars),
    jupiter: makePlanetPos(jupiter),
    saturn: makePlanetPos(saturn),
    uranus: makePlanetPos(uranus),
    neptune: makePlanetPos(neptune),
    pluto: makePlanetPos(pluto),
    chiron: chiron !== null ? makePlanetPos(chiron) : null,
    northNode: makePlanetPos(nn),
    asc,
    mc,
    houses,
  };
}

/** Find the UTC moment when the Sun was 88° of ecliptic longitude earlier. */
export function findDesignTime(birthUtc: Date): Date {
  const tBirth = toTime(birthUtc);
  const sunAtBirth = geocentricLongitude(Body.Sun, tBirth);
  const target = normDeg(sunAtBirth - 88);

  // Binary search backward in time. Solar mean motion ~0.9856°/day,
  // so 88° is ~89.3 days. Start window: 70 to 100 days before birth.
  let lo = new Date(birthUtc.getTime() - 100 * 86400 * 1000);
  let hi = new Date(birthUtc.getTime() - 70 * 86400 * 1000);

  function sunLon(d: Date): number {
    return geocentricLongitude(Body.Sun, toTime(d));
  }

  // We want the largest t < birth such that sunLon(t) ≈ target.
  // sunLon increases over time (mostly); we want to find t where sunLon = target.
  // Use bisection on the signed angular distance.
  function diff(d: Date): number {
    // signed shortest distance from sunLon(d) to target, in [-180, 180]
    const a = sunLon(d);
    let x = target - a;
    while (x > 180) x -= 360;
    while (x < -180) x += 360;
    return x;
  }

  // Ensure lo gives negative diff and hi gives positive diff (or vice versa) by widening.
  let dLo = diff(lo);
  let dHi = diff(hi);
  let attempts = 0;
  while (Math.sign(dLo) === Math.sign(dHi) && attempts < 8) {
    lo = new Date(lo.getTime() - 10 * 86400 * 1000);
    hi = new Date(hi.getTime() + 10 * 86400 * 1000);
    dLo = diff(lo);
    dHi = diff(hi);
    attempts++;
  }
  if (Math.sign(dLo) === Math.sign(dHi)) {
    // fallback: just return 88.0 mean days back
    return new Date(birthUtc.getTime() - 88 * 86400 * 1000);
  }

  for (let i = 0; i < 60; i++) {
    const mid = new Date((lo.getTime() + hi.getTime()) / 2);
    const dMid = diff(mid);
    if (Math.abs(dMid) < 1e-7) return mid;
    if (Math.sign(dMid) === Math.sign(dLo)) {
      lo = mid;
      dLo = dMid;
    } else {
      hi = mid;
      dHi = dMid;
    }
  }
  return new Date((lo.getTime() + hi.getTime()) / 2);
}

export interface DesignActivations {
  sun: number; earth: number; moon: number;
  mercury: number; venus: number; mars: number;
  jupiter: number; saturn: number;
  uranus: number; neptune: number; pluto: number;
  northNode: number; southNode: number;
}

/** Compute the 13 longitudes used in HD at the given UTC moment. */
export function computeActivations(utc: Date): DesignActivations {
  const time = toTime(utc);
  const sun = geocentricLongitude(Body.Sun, time);
  return {
    sun,
    earth: normDeg(sun + 180),
    moon: geocentricLongitude(Body.Moon, time),
    mercury: geocentricLongitude(Body.Mercury, time),
    venus: geocentricLongitude(Body.Venus, time),
    mars: geocentricLongitude(Body.Mars, time),
    jupiter: geocentricLongitude(Body.Jupiter, time),
    saturn: geocentricLongitude(Body.Saturn, time),
    uranus: geocentricLongitude(Body.Uranus, time),
    neptune: geocentricLongitude(Body.Neptune, time),
    pluto: geocentricLongitude(Body.Pluto, time),
    northNode: meanNorthNode(time),
    southNode: normDeg(meanNorthNode(time) + 180),
  };
}

