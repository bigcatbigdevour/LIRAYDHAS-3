// Per-cycle interpretations of what "rising" vs "descending" feels like.

export interface PolarityHalf {
  rising: string;
  descending: string;
}

export const POLARITY_HALVES: Record<string, PolarityHalf> = {
  solar: {
    rising:
      'First half of your year. Things gather. New themes set up shop. The version of you that the year is going to be about is being assembled.',
    descending:
      'Second half of your year. Things complete or shed. What you started after your last birthday either lands or gets returned to sender.',
  },
  mars: {
    rising:
      'Action is organising. A fight or a project is being chosen. Energy goes into formation.',
    descending:
      'Action is being spent. Whatever you started, you are finishing or quitting. The next campaign is not picked yet.',
  },
  jupiter: {
    rising:
      'Doors are opening, even slowly. Scope expands. Opportunities you barely notice add up to something.',
    descending:
      'Harvesting and consolidation. The opportunities that came in the first half are being made real, kept, or let go.',
  },
  saturn: {
    rising:
      'You are building. Structures, commitments, responsibilities accumulate. Pressure increases but so does competence.',
    descending:
      'You are pruning. What you built that does not hold is being identified. The second half of any Saturn period is when you find out what was load-bearing.',
  },
  nodal: {
    rising:
      'You are being pulled. Direction sharpens. People, opportunities, "coincidences" line up to point you somewhere specific.',
    descending:
      'You are settling. The direction you were pulled in becomes the place you live. Less obvious fate; more obvious continuity.',
  },
  chiron: {
    rising:
      'Excavation. The original wound is being touched, named, lived through. Often without choosing to.',
    descending:
      'Integration. The same wound is becoming the thing you understand best. The arrow is becoming medicine.',
  },
  lunarPg: {
    rising:
      'An inner mood is building. Tenderness, restlessness, longing, whatever the current weather is — it is climbing.',
    descending:
      'The same mood is receding. You may not notice. You will only notice that the room has a different feel.',
  },
};
