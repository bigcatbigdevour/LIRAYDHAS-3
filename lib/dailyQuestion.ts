/**
 * One question per day, voiced quietly. Deterministic by date so two
 * visits on the same calendar day get the same question, and consecutive
 * days are always different.
 *
 * The questions are written in the Quiet Observer voice — open, slightly
 * granular, never "what's your intention" or "what are you grateful for".
 * They invite noticing rather than affirming.
 */

const QUESTIONS: string[] = [
  'what was the texture of today?',
  'where did the day take its own shape?',
  'what slowed you down — and what did that reveal?',
  'who did you almost reach for?',
  'what did you decide not to do?',
  'what kept returning to your mind?',
  'where did you act from a story that may not be true anymore?',
  'what stayed with you from a single moment?',
  'what part of today was actually yesterday catching up?',
  'what did you postpone again?',
  'where did you over-explain something?',
  'what did your body know first?',
  'who were you trying to be in front of?',
  'what changed in you between morning and now?',
  'what arrived without you reaching for it?',
  'where did the day go quiet?',
  'what felt rehearsed?',
  'what felt unfamiliar — and were you ok with that?',
  'what did you choose because it was easier than the alternative?',
  'what would a kinder version of you have said?',
  'where did you tighten and not notice you tightened?',
  'what did you almost say out loud?',
  'what felt borrowed?',
  'what stayed half-finished, and why?',
  'where did you mistake intensity for importance?',
  'what was the smallest right thing you did today?',
  'what did the room you were in shape about your day?',
  'what part of today was practice for something later?',
  'who today were you waiting to hear from?',
  'where did the day surprise you in a way you almost missed?',
  'what felt like an old loop running on its own?',
];

/**
 * Returns the question for a given date (YYYY-MM-DD). The selection is
 * stable: same date → same question. Uses a simple deterministic hash so
 * adjacent days don't accidentally collide.
 */
export function questionForDate(dateIso: string): string {
  // Hash the YYYYMMDD digits into an index.
  const digits = dateIso.replace(/-/g, '');
  let n = 0;
  for (let i = 0; i < digits.length; i++) {
    n = (n * 31 + digits.charCodeAt(i)) >>> 0;
  }
  return QUESTIONS[n % QUESTIONS.length];
}
