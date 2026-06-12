// Core data shapes for the app.

export type ZodiacSign =
  | 'Aries' | 'Taurus' | 'Gemini' | 'Cancer'
  | 'Leo' | 'Virgo' | 'Libra' | 'Scorpio'
  | 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces';

export type Chart = 'personality' | 'design';

export type CenterName =
  | 'Head' | 'Ajna' | 'Throat' | 'G'
  | 'Heart' | 'Sacral' | 'SolarPlexus' | 'Spleen' | 'Root';

export type HDType =
  | 'Manifestor' | 'Generator' | 'Manifesting Generator'
  | 'Projector' | 'Reflector';

export type HDAuthority =
  | 'Emotional' | 'Sacral' | 'Splenic' | 'Ego'
  | 'Self-projected' | 'Mental' | 'Lunar';

export type HDDefinition =
  | 'Single' | 'Split' | 'Triple Split' | 'Quadruple Split' | 'No Definition';

export type ProfileDigit = 1 | 2 | 3 | 4 | 5 | 6;
export type Profile = `${ProfileDigit}/${ProfileDigit}`;

export interface PlanetPos {
  longitude: number;   // ecliptic longitude, 0–360
  sign: ZodiacSign;
  degree: number;      // 0–30 inside the sign
  gate: number;        // 1–64
  line: number;        // 1–6
}

export type PlanetName =
  | 'Sun' | 'Earth' | 'Moon'
  | 'Mercury' | 'Venus' | 'Mars'
  | 'Jupiter' | 'Saturn'
  | 'Uranus' | 'Neptune' | 'Pluto'
  | 'Chiron' | 'NorthNode' | 'SouthNode';

export interface NatalChart {
  sun: PlanetPos;
  moon: PlanetPos;
  mercury: PlanetPos;
  venus: PlanetPos;
  mars: PlanetPos;
  jupiter: PlanetPos;
  saturn: PlanetPos;
  uranus: PlanetPos;
  neptune: PlanetPos;
  pluto: PlanetPos;
  chiron: PlanetPos | null;
  northNode: PlanetPos;
  asc: number | null;
  mc: number | null;
  houses: (number | null)[]; // 12 cusps; nulls if time unknown
}

export interface ActiveGate {
  gate: number;
  line: number;
  planet: PlanetName;
  chart: Chart;
  longitude: number;
}

export interface HumanDesign {
  type: HDType;
  strategy: string;
  authority: HDAuthority;
  profile: Profile;
  definition: HDDefinition;
  definedCenters: CenterName[];
  activeGates: ActiveGate[];
  activeChannels: [number, number][];
  incarnationCross: string;
  /** Connected components of defined centers — shows split-definition structure. */
  splits: CenterName[][];
}

export interface Blueprint {
  version: 1;
  birth: {
    iso: string;        // ISO 8601 local birth datetime
    lat: number;
    lon: number;
    tz: string;         // IANA timezone, e.g. America/Los_Angeles
    place: string;      // "San Francisco, California, United States"
    timeUnknown: boolean;
  };
  natal: NatalChart;
  humanDesign: HumanDesign;
}

export interface TransitAspect {
  transitPlanet: PlanetName;
  natalPlanet: PlanetName;
  aspect: 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';
  orb: number;            // exact orb in degrees
  transitLongitude: number;
  natalLongitude: number;
}

export interface DailyReport {
  paragraph: string;
  date: string;           // YYYY-MM-DD
  transits: TransitAspect[];
}

export interface PolarityReading {
  paragraph: string;
  rising: number;
  descending: number;
  generatedAt: string;
}

export interface YearReading {
  paragraph: string;
  generatedAt: string;
}

export interface SynastryReading {
  paragraph: string;
  /** Tightest cross-chart aspects (top 8). */
  aspects: Array<{
    aBody: PlanetName;
    bBody: PlanetName;
    kind: 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';
    orb: number;
    tightness: number;
  }>;
  /** Channels that complete between the two charts. */
  electricChannels: Array<{
    gates: [number, number];
    name: string;
    ownership: {
      a: { gate: number; line?: number } | null;
      b: { gate: number; line?: number } | null;
    };
  }>;
  /** Where each person is in their own life right now. */
  lifeStage: {
    ageA: number;
    ageB: number;
    ageGapYears: number;
    chapterA: string | null;
    chapterB: string | null;
    sameChapter: boolean;
    risingA: number;
    risingB: number;
  };
  generatedAt: string;
}

export interface NarrativeReading {
  paragraph: string;
  generatedAt: string;
}

export interface GeocodeResult {
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}
