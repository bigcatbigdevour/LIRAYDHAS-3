import { MakeTime, MoonPhase as ENGINE_MoonPhase, EclipticGeoMoon } from 'astronomy-engine';
import { normDeg } from './natal';

export type MoonPhaseName =
  | 'New Moon' | 'Waxing Crescent' | 'First Quarter' | 'Waxing Gibbous'
  | 'Full Moon' | 'Waning Gibbous' | 'Last Quarter' | 'Waning Crescent';

export interface MoonState {
  phaseDegrees: number;    // 0..360, ecliptic separation of moon from sun
  illumination: number;    // 0..1
  name: MoonPhaseName;
  moonLongitude: number;
  moonSign: string;
}

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

export function currentMoon(now = new Date()): MoonState {
  const t = MakeTime(now);
  const phase = normDeg(ENGINE_MoonPhase(t));
  const moonEcl = EclipticGeoMoon(t);
  const moonLon = normDeg(moonEcl.lon);
  const moonSign = SIGNS[Math.floor(moonLon / 30)];
  // Illumination ≈ (1 - cos(phase)) / 2
  const illum = (1 - Math.cos((phase * Math.PI) / 180)) / 2;

  let name: MoonPhaseName;
  if (phase < 22.5)       name = 'New Moon';
  else if (phase < 67.5)  name = 'Waxing Crescent';
  else if (phase < 112.5) name = 'First Quarter';
  else if (phase < 157.5) name = 'Waxing Gibbous';
  else if (phase < 202.5) name = 'Full Moon';
  else if (phase < 247.5) name = 'Waning Gibbous';
  else if (phase < 292.5) name = 'Last Quarter';
  else if (phase < 337.5) name = 'Waning Crescent';
  else                    name = 'New Moon';

  return { phaseDegrees: phase, illumination: illum, name, moonLongitude: moonLon, moonSign };
}
/**
 * Days until the next time the moon-sun ecliptic separation reaches `targetPhase`.
 * 0 = new moon, 180 = full moon, 90/270 = quarters.
 */
export function daysUntilPhase(targetPhase: number, now = new Date()): number {
  function delta(d: Date): number {
    const phase = ENGINE_MoonPhase(MakeTime(d));
    let x = targetPhase - phase;
    while (x > 180) x -= 360;
    while (x < -180) x += 360;
    return x;
  }
  // Lunation ≈ 29.53 days. Step forward by ~1.5 days until we bracket.
  let d0 = new Date(now);
  let d1 = new Date(now.getTime() + 1.5 * 86400 * 1000);
  let v0 = delta(d0);
  let v1 = delta(d1);
  let attempts = 0;
  while ((Math.sign(v0) === Math.sign(v1) || v0 < 0) && attempts < 40) {
    d0 = d1;
    v0 = v1;
    d1 = new Date(d1.getTime() + 1.5 * 86400 * 1000);
    v1 = delta(d1);
    attempts++;
  }
  // bisect
  for (let i = 0; i < 30; i++) {
    const mid = new Date((d0.getTime() + d1.getTime()) / 2);
    const vm = delta(mid);
    if (Math.abs(vm) < 0.001) return (mid.getTime() - now.getTime()) / 86400 / 1000;
    if (Math.sign(vm) === Math.sign(v0)) {
      d0 = mid; v0 = vm;
    } else {
      d1 = mid; v1 = vm;
    }
  }
  return (d0.getTime() - now.getTime()) / 86400 / 1000;
}

export interface UpcomingLunation {
  phase: 'new' | 'full' | 'first quarter' | 'last quarter';
  daysUntil: number;
}

/** Returns the next major lunation event soonest from `now`. */
export function nextLunation(now = new Date()): UpcomingLunation {
  const candidates: { phase: UpcomingLunation['phase']; deg: number }[] = [
    { phase: 'new', deg: 0 },
    { phase: 'first quarter', deg: 90 },
    { phase: 'full', deg: 180 },
    { phase: 'last quarter', deg: 270 },
  ];
  const evals = candidates.map((c) => ({ ...c, daysUntil: daysUntilPhase(c.deg, now) }));
  evals.sort((a, b) => a.daysUntil - b.daysUntil);
  return { phase: evals[0].phase, daysUntil: evals[0].daysUntil };
}
