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
  PlanetName,
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
 * House cusps — equal-house system. Each cusp = ASC + 30°*(i-1).
 * MC is NOT necessarily the 10th cusp here; we still report ASC and MC
 * separately as angles.
 *
 * Above latitude ~85° (true polar regions) we return null cusps.
 */
export function houseCusps(
  time: AstroTime,
  latDeg: number,
  lonDeg: number,
): (number | null)[] {
  if (Math.abs(latDeg) > 85) return Array(12).fill(null);
  const asc = ascendant(time, latDeg, lonDeg);
  const cusps: number[] = [];
  for (let i = 0; i < 12; i++) {
    cusps.push(normDeg(asc + 30 * i));
  }
  return cusps;
}

/** Backwards-compatible alias. */
export const placidusHouses = houseCusps;

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
    houses = placidusHouses(time, args.lat, args.lon);
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

/** Lookup table mapping our PlanetName enum to astronomy-engine Body. */
export const PLANET_TO_BODY: Partial<Record<PlanetName, Body>> = {
  Sun: Body.Sun,
  Moon: Body.Moon,
  Mercury: Body.Mercury,
  Venus: Body.Venus,
  Mars: Body.Mars,
  Jupiter: Body.Jupiter,
  Saturn: Body.Saturn,
  Uranus: Body.Uranus,
  Neptune: Body.Neptune,
  Pluto: Body.Pluto,
};
