import type { ZodiacSign } from '../types';

export const SUN_BY_SIGN: Record<ZodiacSign, string> = {
  Aries:       'the engine. You start things. Stillness exhausts you.',
  Taurus:      'the holder. You build slowly. You don\'t move until you mean it.',
  Gemini:      'the cross-talker. Many threads at once. The body of work is plural.',
  Cancer:      'the keeper. You hold what others discard. Memory is currency.',
  Leo:         'the broadcaster. You take up the space that\'s offered. And the space that isn\'t.',
  Virgo:       'the refiner. The work shows in the edits no one sees.',
  Libra:       'the weigher. You hold the room\'s opposites in one hand. Decisions cost you.',
  Scorpio:     'the diver. You go in further than other people will follow.',
  Sagittarius: 'the wanderer. You move toward what feels true. Definitions bore you.',
  Capricorn:   'the climber. The slow yes. You build for the time after your name.',
  Aquarius:    'the outlier. Belonging optional. Patterns visible to you that others miss.',
  Pisces:      'the dissolver. You leak into rooms. Boundaries are a daily project.',
};

export const MOON_BY_SIGN: Record<ZodiacSign, string> = {
  Aries:       'emotional weather: fast and bright. The mood arrives before the words.',
  Taurus:      'emotional weather: slow and resistant to change. Comfort is non-negotiable.',
  Gemini:      'emotional weather: cross-currents. You feel five things at once and want to name them all.',
  Cancer:      'emotional weather: tidal. Feelings rise without warning, recede without explanation.',
  Leo:         'emotional weather: need to be seen. Sulking is a tell.',
  Virgo:       'emotional weather: a quiet inner audit. You feel by listing.',
  Libra:       'emotional weather: shaped by the room. You absorb whoever is near.',
  Scorpio:     'emotional weather: intense. Nothing is small. Everything is data.',
  Sagittarius: 'emotional weather: needs horizon. Cooped-up gets fatal.',
  Capricorn:   'emotional weather: contained. You don\'t cry until you\'ve filed the paperwork.',
  Aquarius:    'emotional weather: detached, then sudden. You watch your feelings from a balcony.',
  Pisces:      'emotional weather: permeable. The room\'s mood becomes yours.',
};

export const RISING_BY_SIGN: Record<ZodiacSign, string> = {
  Aries:       'first impression: forward, alert, slightly impatient.',
  Taurus:      'first impression: still, watchful, slow to warm.',
  Gemini:      'first impression: quick, articulate, slightly evasive.',
  Cancer:      'first impression: soft on the outside, armor underneath.',
  Leo:         'first impression: groomed, warm, takes the floor.',
  Virgo:       'first impression: precise, observing, slightly skeptical.',
  Libra:       'first impression: pleasant, mirroring, hard to read.',
  Scorpio:     'first impression: quiet eyes, dense field, withheld.',
  Sagittarius: 'first impression: open posture, undisguised, candid.',
  Capricorn:   'first impression: composed, reserved, older than your age.',
  Aquarius:    'first impression: detached, unusual, watching the system.',
  Pisces:      'first impression: ambient, blurred, hard to pin down.',
};
