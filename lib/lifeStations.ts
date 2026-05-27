// "Stations" — specific ages where multiple cycles converge, producing
// the felt-everywhere life thresholds that show up across cultures.
//
// Each station names the age, the convergence, and what the threshold
// tends to be about. Used on /arcs as a "Convergence points" section.

export interface LifeStation {
  /** Approximate age in years. */
  age: number;
  /** Short label for the station. */
  label: string;
  /** Which cycle events line up here. */
  convergence: string;
  /** What this age typically holds. */
  description: string;
}

export const LIFE_STATIONS: LifeStation[] = [
  {
    age: 7,
    label: 'First Saturn square',
    convergence: 'Saturn 1/4 + Solar 7 + Mars cycle 3',
    description:
      'The childhood imprint begins to harden into something recognisable. The first time a child has continuous memory and a self-concept they can describe. Cultures across the world treat this as the age of reason for a reason.',
  },
  {
    age: 12,
    label: 'First Jupiter return',
    convergence: 'Jupiter 1 + Solar 12 + Mars cycle 5-6',
    description:
      'Adolescence begins. The map of the world widens for the first time without supervision. Many people remember 12-13 as the year they first felt like a person separate from the family.',
  },
  {
    age: 14.7,
    label: 'First Saturn opposition',
    convergence: 'Saturn flip rising→descending + early Nodal effects',
    description:
      'The midpoint of the first Saturn arc. The structure of childhood starts being load-tested by the demands of adolescence. Identity friction with parents and institutions; first major experiments with who you are vs. who you were told to be.',
  },
  {
    age: 18.6,
    label: 'First Nodal return',
    convergence: 'Nodal 1 + Jupiter mid-cycle + Saturn 5/8',
    description:
      'First independent direction. The pull of fate sharpens. Many people leave home, fall in love, choose a path, or refuse one at almost exactly this age. Whatever you decide here tends to set the angle for the next decade.',
  },
  {
    age: 21,
    label: 'Second Saturn square',
    convergence: 'Saturn 3/4 + Jupiter end-cycle + Mars cycle 10',
    description:
      'Coming-of-age in most legal systems for a reason. The structures of young adulthood are being chosen — career path, partnerships, where to live. Late childhood is being audited; the decisions you make here you will be living inside through your first Saturn return.',
  },
  {
    age: 24,
    label: 'Second Jupiter return',
    convergence: 'Jupiter 2 + Solar 24 + early Saturn build',
    description:
      'Career launch. The first job, gig, or path that feels like yours rather than imposed. Most people commit, at least temporarily, to an identity here that they will be revising at the Saturn return.',
  },
  {
    age: 29.5,
    label: 'First Saturn return',
    convergence: 'Saturn 1 + Jupiter 2.5 + Nodal 1.6',
    description:
      'The reckoning. What you built and inherited in your twenties is load-tested. Career structures crystallise or collapse. Partnerships either commit or end. Many people describe ~28-31 as the most directionally important period of their adult life. By the time it is over the version of you who borrowed all of their assumptions has been replaced.',
  },
  {
    age: 36,
    label: 'Third Jupiter return',
    convergence: 'Jupiter 3 + Solar 36 + mid-Saturn',
    description:
      'Mid-career consolidation. What you committed to after your Saturn return is now real — long enough to assess. Either you are doubling down on the chosen path or quietly preparing the next pivot. The post-Saturn-return identity gets its first real audit.',
  },
  {
    age: 37,
    label: 'Second Nodal return',
    convergence: 'Nodal 2 + Jupiter just-returned + mid-Saturn',
    description:
      'A directional re-orientation, often subtle, often arriving as a relationship or a meeting that reshapes the next decade. The pull of fate gets a second clear voice. People often look back at 36-38 as the period they "found their work" or finally chose a partner.',
  },
  {
    age: 44.2,
    label: 'Saturn descending begins',
    convergence: 'Saturn 1.5 (flip to descending) + Chiron mid-arc',
    description:
      'The first half of adult Saturn is finished — the part where you build. The second half begins — the part where you keep what holds and let go of what does not. Most "midlife crises" are not at 50; they begin here. Quiet at first, then not.',
  },
  {
    age: 50.4,
    label: 'Chiron return',
    convergence: 'Chiron 1 + Nodal mid-cycle + Saturn descending',
    description:
      'Once in a lifetime. The original wound returns with the original gift. The decade around the Chiron return — ages 48-52 — tends to be when people either fully integrate what hurt them or get stuck in it. The teacher arrives whether you are ready or not.',
  },
  {
    age: 56,
    label: 'Third Nodal return',
    convergence: 'Nodal 3 + Saturn 2/4 + post-Chiron',
    description:
      'Late direction. By now you usually know what your life is for, even if you have not said it out loud. The pull of fate now points toward what will outlast you — work, family, lineage, transmission.',
  },
  {
    age: 59,
    label: 'Second Saturn return',
    convergence: 'Saturn 2 + Jupiter 5 + Nodal ~3',
    description:
      'The elder threshold. Whatever structure you built across the second Saturn arc is now standing or falling on its own merits. The question shifts from "what am I building" to "what am I leaving." Many people experience a second profound restructuring here — career, marriage, home, body.',
  },
  {
    age: 73.6,
    label: 'Late Saturn opposition',
    convergence: 'Saturn 2.5 + Jupiter 6 + Nodal 4',
    description:
      'The midpoint of the elder Saturn arc. The work of integration enters its second half. Often coincides with retirement-from-the-role-you-built, and the beginning of whatever the role-you-leave is going to be.',
  },
  {
    age: 84,
    label: 'Uranus return',
    convergence: 'Uranus 1 + Jupiter 7 + Saturn approaching 3',
    description:
      'The eccentric outer planet returns to its natal place once in a long lifetime, around 84. The "what only you could have done" question. Many cultures mark this age — kanreki extended, second eldership.',
  },
  {
    age: 88.4,
    label: 'Third Saturn return',
    convergence: 'Saturn 3 + Jupiter ~7.5 + Nodal ~4.7',
    description:
      'If you make it, the final Saturn reckoning. The structure that has carried you is now fully your own. The question is no longer what to build but how to hand it off.',
  },
];
