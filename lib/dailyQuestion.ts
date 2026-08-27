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
  'where did you confuse motion with progress?',
  'what did you keep checking for, and from whom?',
  'what would you have done if no one was watching?',
  'what felt true that you couldn\'t prove?',
  'what cost you more energy than it deserved?',
  'where did the day reveal an inherited belief?',
  'what did you almost let yourself want?',
  'what did you minimize that you shouldn\'t have?',
  'where did you abandon the harder, slower version?',
  'what would you reframe if you had one more hour?',
  'whose voice were you arguing with in your head?',
  'what felt thinner than it should have?',
  'what was the day really about, under the surface?',
  'where did your attention go without your permission?',
  'what part of today did you treat as background that wasn\'t?',
  'what did you swallow that you could have spoken?',
  'where did you notice grace?',
  'what felt half-true?',
  'where did you make a small choice that was actually large?',
  'what was the question behind your question today?',
  'where did you wait too long?',
  'what surprised you about your own reaction?',
  'what felt like a rehearsal for a future conversation?',
  'where did you protect something — and was it yours to protect?',
  'what did the day look like from the outside?',
  'what did you almost ignore but didn\'t?',
  'what was hardest to put down?',
  'what didn\'t happen, that you noticed not happening?',
  'where did you read someone wrong, or get read wrong?',
  'what felt finally allowed?',
  'where did you confuse certainty with safety?',
  'what showed up that you forgot you were carrying?',
  'what part of today asked for less, not more?',
  'what felt like the day testing something specific about you?',
  'where did the day soften that you didn\'t expect?',
  'who would have understood this day fastest?',
  'what did you choose to believe today?',
  'where did you operate from a pattern you can name?',
  'what landed differently than it would have last year?',
  'what felt like its own small permission?',
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

/**
 * Header label for the question section, picked by local hour so the
 * voice matches the time of day:
 *   pre-noon → "today's question"
 *   noon → ~6pm → "this afternoon's question"
 *   evening → "tonight's question"
 *   late night → "tonight's question" (no "tomorrow" — keeps it grounded)
 */
export function questionLabelForHour(hour: number): string {
  if (hour < 12) return "today's question";
  if (hour < 17) return "this afternoon's question";
  return "tonight's question";
}
