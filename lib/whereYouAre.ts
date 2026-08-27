// "Where you are right now" — a compact bundle of age-and-day facts the
// user can use to orient themselves. Used by /polarity and /arcs headers.

import type { Blueprint } from './types';
import { ageInYears } from './cycles';
import { currentChapter, LIFE_CHAPTERS, type LifeChapter } from './lifeChapters';
import { LIFE_STATIONS, type LifeStation } from './lifeStations';

export interface WhereYouAre {
  ageYears: number;
  ageDays: number;

  /** Days since birth. */
  daysAlive: number;
  /** Days until the user's next birthday / solar return. */
  daysUntilSolarReturn: number;
  /** Days into their current life-chapter. */
  daysIntoChapter: number;
  /** Days until they exit the current life-chapter. */
  daysUntilNextChapter: number;
  /** The chapter they are in. */
  chapter: LifeChapter | null;
  /** The next chapter they'll enter, if any. */
  nextChapter: LifeChapter | null;

  /** The most recently passed life-station + how many days ago. */
  lastStation: { station: LifeStation; daysAgo: number } | null;
  /** The next upcoming life-station + how many days until. */
  nextStation: { station: LifeStation; daysUntil: number } | null;
}

const MS_PER_DAY = 86400 * 1000;
const DAYS_PER_YEAR = 365.2425;

export function whereYouAre(bp: Blueprint, now = new Date()): WhereYouAre {
  const birth = new Date(bp.birth.iso);
  const ageYears = ageInYears(bp.birth.iso, now);
  const daysAlive = (now.getTime() - birth.getTime()) / MS_PER_DAY;
  const ageDays = Math.floor(daysAlive);

  // Next solar return = next birthday on the calendar.
  const nextSolarReturn = new Date(birth.getTime());
  nextSolarReturn.setFullYear(now.getFullYear());
  if (nextSolarReturn.getTime() < now.getTime()) {
    nextSolarReturn.setFullYear(now.getFullYear() + 1);
  }
  const daysUntilSolarReturn = Math.max(
    0,
    (nextSolarReturn.getTime() - now.getTime()) / MS_PER_DAY,
  );

  // Life chapter context
  const chapter = currentChapter(ageYears);
  let daysIntoChapter = 0;
  let daysUntilNextChapter = 0;
  let nextChapter: LifeChapter | null = null;
  if (chapter) {
    daysIntoChapter = (ageYears - chapter.startAge) * DAYS_PER_YEAR;
    daysUntilNextChapter = (chapter.endAge - ageYears) * DAYS_PER_YEAR;
    nextChapter = LIFE_CHAPTERS.find((c) => c.startAge === chapter.endAge) ?? null;
  }

  // Last + next life-station
  let lastStation: WhereYouAre['lastStation'] = null;
  let nextStation: WhereYouAre['nextStation'] = null;
  const stationsByAge = [...LIFE_STATIONS].sort((a, b) => a.age - b.age);
  for (const s of stationsByAge) {
    if (s.age <= ageYears) {
      const daysAgo = (ageYears - s.age) * DAYS_PER_YEAR;
      if (lastStation === null || daysAgo < lastStation.daysAgo) {
        lastStation = { station: s, daysAgo };
      }
    } else if (nextStation === null) {
      const daysUntil = (s.age - ageYears) * DAYS_PER_YEAR;
      nextStation = { station: s, daysUntil };
      break;
    }
  }

  return {
    ageYears,
    ageDays,
    daysAlive,
    daysUntilSolarReturn,
    daysIntoChapter,
    daysUntilNextChapter,
    chapter,
    nextChapter,
    lastStation,
    nextStation,
  };
}

/** Pretty-print a day count: "32 days", "1 year 4 months", etc. */
export function prettyDays(days: number): string {
  const abs = Math.abs(days);
  if (abs < 1) return abs < 0.5 ? 'today' : '1 day';
  if (abs < 60) return `${Math.round(abs)} days`;
  if (abs < 365) return `${(abs / 30.44).toFixed(1)} months`;
  const years = abs / DAYS_PER_YEAR;
  if (years < 5) return `${years.toFixed(1)} years`;
  return `${Math.round(years)} years`;
}
