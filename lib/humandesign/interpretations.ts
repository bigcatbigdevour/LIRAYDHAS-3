// Short canonical descriptions for HD type, authority, profile, and incarnation cross.
// Tone matches the rest of the app: dry, plain, slightly clinical.

import type { HDAuthority, HDType, Profile } from '../types';

export const TYPE_DESCRIPTIONS: Record<HDType, string> = {
  Manifestor:
    'Initiators. Built to start things without waiting. Energy comes in bursts; stillness recharges it. Inform others before you act — not to ask permission, to reduce friction.',
  Generator:
    'The bulk of the population. Sustainable life force in the Sacral. Designed to respond, not to push. When you respond to what shows up, the energy is endless. When you try to initiate, you hit walls.',
  'Manifesting Generator':
    'Multi-process Generators. Skip steps, do many things at once, change directions mid-task. Same Sacral response mechanism, but with a Manifestor-like need to inform the people you affect.',
  Projector:
    'Wired to see and guide others. No consistent motor of your own. Built to be invited, recognized, and used correctly. Without invitation, your energy bounces off; with it, you can run circles around Generators.',
  Reflector:
    'No defined centers. A mirror of the community you stand in. Take a full lunar cycle — ~28 days — for any big decision. What you feel today is mostly the room, not you.',
};

export const AUTHORITY_DESCRIPTIONS: Record<HDAuthority, string> = {
  Emotional:
    'Wait for the wave to settle. Clarity is not a feeling in the moment; it’s the absence of distortion across a few days. Sleep on it. Then sleep on it again.',
  Sacral:
    'A gut sound — uh-huh, uh-uh — before the mind argues. Trust the immediate energetic yes or no in the body, not the rationalization that follows.',
  Splenic:
    'Quiet, instant, one-time knowing. Won’t repeat itself. If you missed it or talked over it, it doesn’t come back. Health, intuition, survival.',
  Ego:
    'Decisions through the willpower center. What do I want? What can I commit to? Your authority lives in what you’re actually willing to back.',
  'Self-projected':
    'Talk it out. Hear your own voice. The truth surfaces while you speak — not in your head, not in the listener’s response.',
  Mental:
    'No inner authority. Use a sounding board of trusted people across several days. The clarity is in the room, in the conversation, not inside you alone.',
  Lunar:
    'A full lunar cycle (about 28 days) before any major commitment. You will feel differently as the moon passes through every gate. Wait for the full pattern.',
};

const PROFILE_LINES: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
  1: 'Investigator',
  2: 'Hermit',
  3: 'Martyr',
  4: 'Opportunist',
  5: 'Heretic',
  6: 'Role Model',
};

export function profileName(p: Profile): string {
  const [a, b] = p.split('/').map((s) => Number(s)) as [
    keyof typeof PROFILE_LINES,
    keyof typeof PROFILE_LINES,
  ];
  return `${PROFILE_LINES[a]} / ${PROFILE_LINES[b]}`;
}

export function profileDescription(p: Profile): string {
  switch (p) {
    case '1/3': return 'A foundation-builder who learns by trial. Researches the ground beneath them; then tests it.';
    case '1/4': return 'A foundation-builder who lives through community. Investigates deeply, then teaches who they know.';
    case '2/4': return 'A natural with a gift hidden until others call it out. Most progress happens through the network.';
    case '2/5': return 'A natural who keeps disappearing and re-emerging with answers others were waiting for.';
    case '3/5': return 'Trial-and-error in the open. Practical, projection-attracting, designed to find what doesn’t work.';
    case '3/6': return 'Two-phase life: experiment hard, then climb the roof and observe. After ~50 you become the wise example.';
    case '4/6': return 'Network-bound for the first half, then transitions into the observer-role-model phase. Friendship matters.';
    case '4/1': return 'A teacher with a fixed foundation. Influences only those they already know.';
    case '5/1': return 'A heretic with a teacher’s foundation. Universalising patterns, dispelling collective myths.';
    case '5/2': return 'A heretic who is also a natural. Solutions arrive without effort; they are not understood by you.';
    case '6/2': return 'Wise observer with hidden talent. The first ~30 years are messy; the rest is the role model.';
    case '6/3': return 'Wise observer who learned through chaos. Many false starts; the third phase is quietly authoritative.';
    default: return 'A mix of foundation-laying and seeing-from-the-roof. Read each digit separately, then together.';
  }
}

// Incarnation Cross names — a small subset of the most common combinations.
// Keyed by "pSun/pEarth/dSun/dEarth" gates (joined with slashes).
// Full lookup is large; we provide a friendly fallback for unknowns.
const CROSS_NAMES: Record<string, string> = {
  '1/2/7/13': 'Right Angle Cross of the Sphinx',
  '2/1/13/7': 'Right Angle Cross of the Sphinx',
  '7/13/1/2': 'Juxtaposition Cross of the Alpha',
  '13/7/2/1': 'Right Angle Cross of the Sphinx',
  '3/50/41/31': 'Right Angle Cross of Laws',
  '4/49/8/14': 'Right Angle Cross of Explanation',
  '5/35/15/10': 'Right Angle Cross of Consciousness',
  '6/36/15/10': 'Juxtaposition Cross of Conflict',
  '8/14/55/59': 'Right Angle Cross of Contagion',
  '11/12/56/60': 'Right Angle Cross of Eden',
  '13/7/43/23': 'Right Angle Cross of the Sphinx 2',
  '17/18/38/39': 'Right Angle Cross of Service',
  '23/43/30/29': 'Right Angle Cross of Explanation 2',
  '25/46/58/52': 'Right Angle Cross of the Vessel of Love',
  '29/30/20/34': 'Right Angle Cross of Contagion 2',
  '34/20/40/37': 'Right Angle Cross of Power',
  '39/38/58/52': 'Right Angle Cross of Individualism',
  '55/59/9/16':  'Right Angle Cross of the Sleeping Phoenix',
  '63/64/5/35':  'Right Angle Cross of Consciousness 2',
};

export function crossName(pSun: number, pEarth: number, dSun: number, dEarth: number): string | null {
  return CROSS_NAMES[`${pSun}/${pEarth}/${dSun}/${dEarth}`] ?? null;
}
