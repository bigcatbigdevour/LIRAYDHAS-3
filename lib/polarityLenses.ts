// Deep multi-lens descriptions of each cycle's polarity, used on /polarity.
//
// Distinct from polarityHalves.ts (which is the short "rising · now / next:
// descending" copy inside an expanded bar). This is the longer write-up
// that lives below the bars in the cycle-by-cycle guide, covering what
// rising-vs-descending FEELS like for that specific cycle through several
// lenses (subjective experience, what to do, what is changing).

export interface PolarityLens {
  /** A short note on what you might feel from inside the rising half. */
  inRising: string;
  /** A short note on what you might feel from inside the descending half. */
  inDescending: string;
  /** What this cycle's flip tends to look like from the outside. */
  flipSignals: string;
  /** What this cycle pairs well with — patterns across cycles. */
  pairings: string;
}

export const POLARITY_LENSES: Record<string, PolarityLens> = {
  solar: {
    inRising:
      'Energy gathers around the version of you you became at your last birthday. You are still recruiting evidence that this new year is the year. Most new things, new relationships, new identities start here.',
    inDescending:
      'You stop recruiting. You start sorting. The themes that took shape in the first half are tested against reality. By the last weeks before your next birthday, you usually know what is staying and what is being shed.',
    flipSignals:
      'A sense, six months in, that you have already done what this year was for — or that you have been pretending. Either way the gear shifts. Sleep often gets weirder for a few weeks around the flip.',
    pairings:
      'The Solar flip is small on its own. Pay attention if your Solar flip lines up with a Saturn or Nodal flip — that combination is rarely subtle.',
  },
  mars: {
    inRising:
      'You are picking a fight, even if quietly. Energy is being marshalled around something specific — a project, a relationship problem you are about to address, an ambition that just woke up.',
    inDescending:
      'You are spending what you marshalled. Either the campaign is being won (and wrapped) or being lost (and abandoned). The Mars descending half is when you find out if the fight was worth picking.',
    flipSignals:
      'A loss of interest in the thing that just consumed two years of you, often accompanied by a new and unrelated obsession that arrives unbidden.',
    pairings:
      'Mars rising during Saturn rising = building hard. Mars descending during Saturn descending = a major chapter ending. Mars rising during Saturn descending = trying to rescue something already pruned.',
  },
  jupiter: {
    inRising:
      'Doors keep opening that you did not knock on. Your scope of imagination is wider than your current life. You are being shown larger possibilities than you are ready for, which is usually how Jupiter offers anything.',
    inDescending:
      'The wide-open phase narrows. You are deciding what you actually want from the abundance that came in. Many of the opportunities of the rising half get dropped — that is correct, not a failure.',
    flipSignals:
      'An audit moment around year 6 of any Jupiter cycle. The thing that felt promising at the start either reveals its real size or reveals its limit.',
    pairings:
      'Jupiter rising + Nodal rising = the meaningful expansion years. Jupiter descending + Saturn rising = pruning while still being asked to build. That combination is what mid-career exhaustion is made of.',
  },
  saturn: {
    inRising:
      'You are building structure — career, relationships, the shape of your adult life. Pressure is increasing. Competence is increasing faster than you notice. Most of the responsibility you take on here you will be carrying for decades.',
    inDescending:
      'The structures get tested. What you built that was load-bearing gets reinforced; what was decorative gets stripped or falls off on its own. Many divorces, career exits, and reinventions happen in the second half of a Saturn cycle.',
    flipSignals:
      'A creeping sense that the life you are inside is too small or too borrowed. Often arrives ~15 years into a Saturn period. People often try to fix it through changing jobs/partners. The fix is usually more structural than that.',
    pairings:
      'Saturn flips at ~14.7, ~44.2, ~73.6 — these are between-the-returns midpoints. They are quieter than the returns themselves but reorient just as much. Pay attention.',
  },
  nodal: {
    inRising:
      'You are being pulled — by people, by coincidence, by what your life seems to want from you. The North-Node-rising half is when fate has the loudest voice.',
    inDescending:
      'The pulling stops, or you stop noticing it. You settle into what the pulling delivered. Direction becomes routine. From the inside this can feel like loss of meaning; it is usually just integration.',
    flipSignals:
      'A directional shift that the rational mind would not have chosen. Often appears as someone or something arriving that does not fit your current life — and you knowing immediately that they do.',
    pairings:
      'Nodal rising during Saturn rising = a meaningful structural commitment, often early career or partnership. Nodal rising during Chiron rising = a vocation built around the wound.',
  },
  chiron: {
    inRising:
      'You are excavating the original wound. Often without choosing to. Therapists, illness, family crises, the same patterns showing up again and again — these are Chiron rising. The first 25 years of life are inside one rising Chiron half for everyone.',
    inDescending:
      'You start being good at what hurt you. The wound becomes recognisable, then nameable, then teachable. The arrow becomes medicine. The Chiron descending half is most of midlife and elderhood for most people.',
    flipSignals:
      'A felt sense, somewhere around age 25, that what your story is about has shifted from being inside the wound to being able to look at it. The shift is often invisible from outside.',
    pairings:
      'Chiron descending during Nodal rising = the wound finding its public form (the teacher, the artist, the founder). Many "what was that all for" reckonings line up here.',
  },
  lunarPg: {
    inRising:
      'An inner mood is building. It does not announce itself. You feel quietly more tender, more restless, more drawn to a particular kind of company — and then a year later you realise it has been building all along.',
    inDescending:
      'The same mood lets go, also quietly. Where you live, what you eat, who you call — these may shift without your noticing. By the end of the descending half you have already moved on.',
    flipSignals:
      'A change in where you want to spend time. Often the only signal is that your favourite room in your house has changed.',
    pairings:
      'The progressed Moon flips are the quietest of all but they show up most strongly in the body — sleep, appetite, sexuality, where home is. Track them by what your physical life is doing, not by what you think.',
  },
};
