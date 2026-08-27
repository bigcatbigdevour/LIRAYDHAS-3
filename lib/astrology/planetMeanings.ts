/**
 * Short, voice-matched explanations of what each planet represents in
 * the chart. Used by the natal-wheel tap-to-explain overlay.
 *
 * Two lines each: a one-line job description, then a sentence about
 * how it shows up.
 */

import type { PlanetName } from '../types';

export interface PlanetMeaning {
  /** The job. One short clause. */
  role: string;
  /** How it shows up — a fuller line. */
  showsUp: string;
}

export const PLANET_MEANINGS: Record<PlanetName, PlanetMeaning> = {
  Sun: {
    role: 'core identity, ego, life force',
    showsUp: 'Who you are when no one is performing for you. The thing it would cost you to dim.',
  },
  Moon: {
    role: 'inner life, emotional weather, what soothes',
    showsUp: 'How you metabolise feeling. What you instinctively reach for when tired or unwell.',
  },
  Mercury: {
    role: 'thinking, talking, the daily mind',
    showsUp: 'The rhythm of how you process and articulate. Your default conversation style.',
  },
  Venus: {
    role: 'what you love, what you find beautiful',
    showsUp: 'Your taste, your aesthetic sense, the texture of how you relate. Money as taste.',
  },
  Mars: {
    role: 'drive, anger, what you fight for',
    showsUp: 'How you take action when something matters. Your default conflict shape.',
  },
  Jupiter: {
    role: 'expansion, belief, what you trust the world to give',
    showsUp: 'Where you bet on more — and where the world tends to bet on you. Luck-shaped.',
  },
  Saturn: {
    role: 'structure, consequence, the teacher',
    showsUp: 'Where the lessons are slow but permanent. The walls that turn out to be load-bearing.',
  },
  Uranus: {
    role: 'sudden change, electricity, breaking with the past',
    showsUp: 'Where the lightning strikes. Where you can\'t be domesticated.',
  },
  Neptune: {
    role: 'dreams, dissolution, the ocean',
    showsUp: 'Where you\'re susceptible to glamour. The boundary between you and everything is thinnest here.',
  },
  Pluto: {
    role: 'underworld, power, irreversible transformation',
    showsUp: 'What compulsively breaks down in you so something else can be born. Slow, geological.',
  },
  Earth: {
    role: 'the body, the present moment, the ground',
    showsUp: 'Exactly opposite your Sun on the zodiac wheel. The lens of being here, in matter.',
  },
  NorthNode: {
    role: 'the direction your life is pulling',
    showsUp: 'Where growth is uncomfortable but mandatory. The next chapter, asking.',
  },
  SouthNode: {
    role: 'what you came in already knowing',
    showsUp: 'Your default settings. The comfortable place you outgrow by living forward.',
  },
  Chiron: {
    role: 'the original wound, the original teaching',
    showsUp: 'Where you carry an old hurt that, with time, becomes the thing you can offer others.',
  },
};
