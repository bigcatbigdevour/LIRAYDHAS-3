// Multi-lens descriptions for each major life cycle.
//
// Each cycle is read four ways:
//   - astrological: what the planet represents in the tropical chart
//   - psychological: developmental / depth-psych meaning
//   - mundane:      typical lived events at this stage
//   - mythic:       the archetype, the story shape

import type { Cycle } from './cycles';

export interface CycleLens {
  astrological: string;
  psychological: string;
  mundane: string;
  mythic: string;
}

export const CYCLE_LENSES: Record<string, CycleLens> = {
  solar: {
    astrological:
      'Every year on (or near) your birthday the Sun returns to the exact ecliptic degree it occupied at your birth. A chart cast for that instant — the Solar Return — sets the tone for the year ahead.',
    psychological:
      'An identity reset. The sense of "I" finds its bearings again. Anything you bring forward into the new year carries the imprint of who you decide you are at that moment.',
    mundane:
      'Birthday to birthday. The natural unit of personal time. First half of the year tends to build, second half tends to release — see the Polarity tab for which half you are in.',
    mythic:
      'The hero returns to where he started. The road is the same; the walker is not.',
  },
  mars: {
    astrological:
      'Mars takes about 779 days (2.135 years) to return to the same position relative to the Sun. The synodic cycle of doing — action, friction, what you are willing to fight for.',
    psychological:
      'A two-year drive cycle. What is your push about right now? When this resets, your battles change. Old fights stop mattering; new ones arrive.',
    mundane:
      'Projects. Trainings. The thing you have been hot about for ~2 years. Promotions earned, fights picked, partnerships hardened or broken.',
    mythic:
      'The warrior\'s campaign. Gear up, charge, victory or retreat, sheath the sword, gear up again.',
  },
  jupiter: {
    astrological:
      'Jupiter completes one orbit in about 11.86 years. Each return reopens the question of meaning, scope, growth, what you trust the world to give you.',
    psychological:
      'A worldview matures, hopes refresh, scope expands or recalibrates. The first return at ~12 sets the template; subsequent ones audit it.',
    mundane:
      'Big chapter marks at ~12, ~24, ~36, ~48, ~60, ~72. School transitions, career launches, mid-life reconsiderations, late-life reframes.',
    mythic:
      'The benefactor returns. A door opens. The next country in your map is announced.',
  },
  saturn: {
    astrological:
      'Saturn returns every ~29.5 years — at ~29, ~59, and (if you make it) ~88. The lord of structure, time, and consequence shows you what you actually built.',
    psychological:
      'The reckoning of adulthood. What holds, what does not, what you are now required to take responsibility for. The reorganisation is rarely gentle.',
    mundane:
      'Late twenties: career structures form, relationships either commit or end, the inherited self of your twenties cracks. Late fifties: the same scale of reset, but about legacy.',
    mythic:
      'The taskmaster appears. The price of who you have become is collected. The architecture of the second half of life is laid down here.',
  },
  nodal: {
    astrological:
      'The lunar nodes regress around the chart every ~18.6 years. The North Node points toward your evolutionary direction; its return reorients the compass.',
    psychological:
      'A pull toward what your life is for. Less about what you want and more about what wants you. The pull intensifies near returns.',
    mundane:
      'At ~18.6, ~37, ~56, ~75. Often a felt sense of "what am I actually doing with this" — and a redirection that the rational mind would not have chosen.',
    mythic:
      'The crossroads. The signpost. Fate clearing its throat.',
  },
  chiron: {
    astrological:
      'Chiron completes its eccentric orbit in about 50.4 years. Its return — once in a lifetime, around age 50 — touches the original wound and the original gift.',
    psychological:
      'A massive integration of what has hurt you. The shape of your suffering finally legible. Often the moment you realise the wound and the teaching are the same thing.',
    mundane:
      'Around age 49-51. Often coincides with a "what was that all for" reckoning. Career, marriage, body, parents — the whole inventory gets opened.',
    mythic:
      'The wounded healer comes home. The arrow you have been carrying becomes the medicine you give.',
  },
  lunarPg: {
    astrological:
      'The progressed Moon completes its circle of the chart in about 27.3 years, spending ~2.3 years in each natal house. Inner emotional weather, slowed down.',
    psychological:
      'How you feel about yourself, your tenderness, your need for shelter — these shift in ~2.3-year waves. Long enough to feel like personality, short enough to actually be a phase.',
    mundane:
      'Where you live, who you let close, what soothes you. Quietly redrawn every couple of years without you noticing.',
    mythic:
      'The tide goes out. The tide comes back. Nothing dramatic. Everything different.',
  },
};

export interface ArcContext {
  cycle: Cycle;
  nthCycle: number;   // 1, 2, 3 ... (which return-cycle this arc is, 1 = first)
  ageStart: number;
  ageEnd: number;
}

/**
 * Specific text for the early iterations of the slower cycles (Saturn,
 * Jupiter, Chiron, Nodal). Generic fallback for everything else.
 */
const ITERATION_TEXT: Record<string, Record<number, string>> = {
  saturn: {
    1: 'Birth to ~29.5. The childhood/young-adult arc. Most of what you call "your personality" was formed inside this single Saturn period — much of it on borrowed assumptions from family, schooling, era. The first return at the end is where the borrowed becomes load-tested.',
    2: '~29.5 to ~59. The middle Saturn arc — adulthood proper. What you built in the first arc gets renovated, replaced, or condemned. By the end, the structure you actually live inside is the one you chose, not the one you inherited.',
    3: '~59 to ~88. The elder Saturn arc. The structure now stands or falls on its own foundations. Legacy, lineage, what outlasts you.',
  },
  jupiter: {
    1: 'Birth to ~12. The childhood expansion. Your first sense of how big the world is, what it owes you, what it gives.',
    2: '~12 to ~24. Adolescence into early adulthood. The map of possibility blows wide open and then has to be tested against reality.',
    3: '~24 to ~36. Career launch. What you want is no longer abstract; you are now committing actual years to it.',
    4: '~36 to ~48. Mid-career consolidation, or the realisation that the thing you were building is not the thing you want to keep building.',
    5: '~48 to ~60. The recalibration. What you trust the world to give you gets a hard audit.',
    6: '~60 to ~72. Late-career and post-career reframes. Meaning is reshuffled.',
  },
  nodal: {
    1: 'Birth to ~18.6. Childhood and the first edge of self-direction.',
    2: '~18.6 to ~37. The long young-adult orientation period. The direction your life takes here is rarely the one you predicted at the start.',
    3: '~37 to ~56. The middle direction. By the end you usually know what your life is actually about, even if you have not said it out loud.',
    4: '~56 to ~75. The late direction. The arrow finally lands.',
  },
  chiron: {
    1: 'Birth to ~50. The wound shapes you, mostly invisibly, for the entire first arc. By the end you may know its name.',
    2: '~50 to ~100. The teaching arc, if there is one.',
  },
};

const GENERIC_ITERATION = (cycle: Cycle, n: number, ageStart: number, ageEnd: number) =>
  `Your ${ordinal(n)} ${cycle.label.toLowerCase()} arc — ages ${ageStart.toFixed(1)} to ${ageEnd.toFixed(1)}. ${cycle.description}`;

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

export function arcDescription(ctx: ArcContext): string {
  const cycleText = ITERATION_TEXT[ctx.cycle.key]?.[ctx.nthCycle];
  if (cycleText) {
    return `Your ${ordinal(ctx.nthCycle)} ${ctx.cycle.label.toLowerCase()} — ages ${ctx.ageStart.toFixed(1)} to ${ctx.ageEnd.toFixed(1)}.\n\n${cycleText}`;
  }
  return GENERIC_ITERATION(ctx.cycle, ctx.nthCycle, ctx.ageStart, ctx.ageEnd);
}
