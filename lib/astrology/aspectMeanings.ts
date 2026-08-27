// Plain-language one-liners for what a given aspect tends to do.

import type { PlanetName } from '../types';

type Aspect = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';

const GENERIC: Record<Aspect, string> = {
  conjunction: 'fuses the two themes. Hard to separate one signal from the other.',
  sextile:     'opens a small door. Easy to walk through if you notice it.',
  square:      'friction. Two themes that won\'t fit politely in the same room.',
  trine:       'flow. Maybe so easy you skip the lesson.',
  opposition:  'a see-saw. You can hold both but not simultaneously.',
};

const SPECIFIC: Partial<Record<string, string>> = {
  // Sun pairs — identity meets the rest of the chart.
  'Saturn|Sun|conjunction':     'compression. The work asks for a higher standard than yesterday.',
  'Saturn|Sun|square':          'authority friction. A teacher returns dressed as an obstacle.',
  'Saturn|Sun|opposition':      'reality check. The pace you set is being measured.',
  'Saturn|Sun|trine':           'structure that fits. Discipline feels less like punishment.',
  'Jupiter|Sun|conjunction':    'a door opens. Easy yeses today are not free.',
  'Jupiter|Sun|square':         'overreach. The "yes" forgets to count its costs.',
  'Jupiter|Sun|trine':          'expansion. The path of least resistance is actually correct.',
  'Pluto|Sun|conjunction':      'rebirth pressure. The version of you that worked last year is up for replacement.',
  'Pluto|Sun|square':           'power friction. Don\'t fold to it; don\'t pick it up either.',
  'Pluto|Sun|opposition':       'someone holds a mirror you didn\'t consent to. Look anyway.',
  'Neptune|Sun|conjunction':    'fog. Trust nothing you decide quickly.',
  'Neptune|Sun|square':         'the picture you carry of yourself doesn\'t quite match the photograph.',
  'Uranus|Sun|conjunction':     'disruption. Plans rearrange themselves around something unscheduled.',
  'Uranus|Sun|square':          'a restlessness that won\'t name itself. Don\'t mistake it for a destination.',
  'Mars|Sun|conjunction':       'momentum. The body wants to act before the mind has caught up.',
  'Mars|Sun|square':            'short fuse. The fight you pick today is rehearsing an older one.',
  'Venus|Sun|conjunction':      'warmth. You\'re more likeable than usual; trust it without leaning on it.',

  // Moon pairs — emotional weather.
  'Saturn|Moon|conjunction':    'a cold steadiness. Feelings get filed before they\'re felt.',
  'Saturn|Moon|square':         'old loneliness shows up uninvited. Sit with it; don\'t feed it a story.',
  'Saturn|Moon|opposition':     'an adult voice and a child\'s mood, in the same room.',
  'Jupiter|Moon|conjunction':   'big feelings, generous container. Don\'t mistake the size for permanence.',
  'Jupiter|Moon|trine':         'mood travels well. People feel met by you today.',
  'Pluto|Moon|conjunction':     'a deep feeling surfaces. Whatever was buried is no longer buried.',
  'Pluto|Moon|square':          'emotional power play — usually inside the head, not outside it.',
  'Neptune|Moon|conjunction':   'dream-level mood. What you\'re feeling may not belong to today at all.',
  'Neptune|Moon|square':        'mood without a referent. Be careful naming it too quickly.',
  'Uranus|Moon|conjunction':    'mood jolts. The room you were in five minutes ago is gone.',
  'Mars|Moon|conjunction':      'feelings with sharp edges. Tone matters more than content.',
  'Mars|Moon|square':           'irritability with no obvious target. Don\'t hand it to the nearest person.',
  'Venus|Moon|conjunction':     'soft tone. Easy to receive others and be received.',
  'Venus|Moon|trine':           'a calm warmth toward yourself, rare and worth noticing.',
  'Moon|Moon|conjunction':      'a quiet reset of mood. Today belongs to feeling, not solving.',
  'Moon|Moon|square':           'emotional friction. Whatever the room is doing, you\'re doing twice.',

  // Mars pairs — drive, fight, action.
  'Mars|Mars|conjunction':      'new fight. Whatever you start today, you\'re going to keep starting.',
  'Saturn|Mars|conjunction':    'effort with brakes on. Work is heavier; nothing wrong with that.',
  'Saturn|Mars|square':         'frustration. The thing won\'t move at the speed your body wants.',
  'Pluto|Mars|conjunction':     'force. Easy to confuse intensity for direction.',
  'Pluto|Mars|square':          'power-against-power. Pick what you\'re actually fighting for, then fight quietly.',
  'Jupiter|Mars|conjunction':   'a green light. Move — but don\'t bet bigger than you\'d bet sober.',
  'Uranus|Mars|conjunction':    'sudden action. The body decides before the mind reviews.',
  'Neptune|Mars|conjunction':   'effort that dissolves. Don\'t mistake fatigue for a moral failing.',

  // Venus pairs — relating, value, taste.
  'Venus|Venus|conjunction':    'aesthetic clarity. What you like, you like more clearly today.',
  'Saturn|Venus|conjunction':   'love asks for definition. The relationship is being asked to grow up.',
  'Saturn|Venus|square':        'a sense that you\'re not being met. Check what you\'re actually offering first.',
  'Pluto|Venus|conjunction':    'intense attraction or an old wound — sometimes both at the same address.',
  'Pluto|Venus|square':         'power inside intimacy. Notice the small currency exchanges, not just the loud ones.',
  'Uranus|Venus|conjunction':   'someone new, or someone old in a new light. Don\'t over-promise on day one.',
  'Neptune|Venus|conjunction':  'a dream-version of someone. Lovely, possibly imagined.',
  'Jupiter|Venus|trine':        'social ease. Doors open without you knocking.',

  // Sun–Moon — the inner conversation.
  'Sun|Moon|conjunction':       'identity and mood agree. A rare alignment; spend it on something real.',
  'Sun|Moon|square':            'the outer face and inner weather disagree. Both are honest.',
  'Sun|Moon|opposition':        'a tug between who you are and what you feel. Neither is wrong, neither is permanent.',
  'Sun|Moon|trine':             'an inner steadiness. The wanted self and felt self are roommates today, not rivals.',

  // Mercury — voice and mind.
  'Mercury|Sun|conjunction':    'thinking and speaking line up. Easy day to put a hard thing into words.',
  'Mercury|Mercury|conjunction':'a reset of how you talk to yourself. Listen first.',
  'Saturn|Mercury|conjunction': 'careful speech. Useful for hard conversations, costly for warm ones.',
  'Mercury|Mars|conjunction':   'sharp tongue. Re-read before you send.',
  'Mercury|Mars|square':        'an argument trying to happen. Notice the urge to win; let it pass.',

  // Jupiter — expansion and easy yeses.
  'Jupiter|Jupiter|conjunction':'a fresh-start optimism. The shape of the next 12 years is being drafted.',
};

export function aspectMeaning(
  transit: PlanetName,
  natal: PlanetName,
  aspect: Aspect,
): string {
  const key = `${transit}|${natal}|${aspect}`;
  return SPECIFIC[key] ?? GENERIC[aspect];
}

/**
 * Natal aspects are symmetric (Saturn-square-Sun has the same meaning
 * regardless of which you name first), so look up both orderings and
 * prefer whichever hits the SPECIFIC table. Falls back to the generic
 * aspect line if neither ordering is in the table.
 */
export function natalAspectMeaning(
  a: PlanetName,
  b: PlanetName,
  aspect: Aspect,
): string {
  const direct = SPECIFIC[`${a}|${b}|${aspect}`];
  if (direct) return direct;
  const swapped = SPECIFIC[`${b}|${a}|${aspect}`];
  if (swapped) return swapped;
  return GENERIC[aspect];
}
