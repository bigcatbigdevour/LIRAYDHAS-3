import { Body, MakeTime, MoonPhase as ENGINE_MoonPhase, EclipticGeoMoon } from 'astronomy-engine';
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
// Body import kept for parity even if not used directly (tree-shake safe)
export { Body };
