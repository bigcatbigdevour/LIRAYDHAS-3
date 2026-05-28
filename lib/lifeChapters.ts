// Life-chapter epochs — the broad sections of life bounded by major returns.

export interface LifeChapter {
  startAge: number;
  endAge: number;
  label: string;
  description: string;
}

export const LIFE_CHAPTERS: LifeChapter[] = [
  {
    startAge: 0,
    endAge: 12,
    label: 'First childhood',
    description:
      'The first Jupiter cycle. Identity is being downloaded from family, environment, era. Memory begins to consolidate. The version of you that the next two decades will be auditing is forming here.',
  },
  {
    startAge: 12,
    endAge: 18.6,
    label: 'Adolescence',
    description:
      'First Jupiter return through first Nodal return. The world widens, then has to be tested against reality. The map of possibility is built and the first major directional pull lands at the end.',
  },
  {
    startAge: 18.6,
    endAge: 29.5,
    label: 'Apprentice',
    description:
      'First Nodal return through first Saturn return. The decisions about career, partnership, and place that will be load-tested in your late twenties are being made here. Most of this period is borrowed assumptions.',
  },
  {
    startAge: 29.5,
    endAge: 50.4,
    label: 'Adulthood proper',
    description:
      'First Saturn return through Chiron return. The longest single chapter. What you actually build is built here. By the end you usually know what your life is for, whether or not you can say it.',
  },
  {
    startAge: 50.4,
    endAge: 59,
    label: 'Integration',
    description:
      'Chiron return through second Saturn return. The wound becomes the teaching. The structures of midlife either reinforce or give way. The work shifts from building to keeping.',
  },
  {
    startAge: 59,
    endAge: 84,
    label: 'Elderhood',
    description:
      'Second Saturn return through Uranus return. What outlasts you starts to matter more than what you accumulate. Legacy is the dominant note.',
  },
  {
    startAge: 84,
    endAge: 92,
    label: 'The long sky',
    description:
      'Past the Uranus return. The third Saturn return at 88 if you make it. What was always uniquely yours becomes most fully visible.',
  },
];

export function currentChapter(age: number): LifeChapter | null {
  return LIFE_CHAPTERS.find((c) => age >= c.startAge && age < c.endAge) ?? null;
}
