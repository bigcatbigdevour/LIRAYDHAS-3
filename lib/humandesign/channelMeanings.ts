// Short canonical gloss for each of the 36 HD channels.

const M: Record<string, string> = {
  'Abstraction (64-47)':         'Pressure to make sense of what was. Sorting raw experience into patterns.',
  'Awareness (61-24)':           'Pressure to know. A mind that returns to the same question until it cracks.',
  'Logic (63-4)':                'Doubt that becomes hypothesis. Pattern-checking what other people take on faith.',
  'Acceptance (17-62)':          'Organized opinion. Theory turned into precise speech.',
  'Structuring (43-23)':         'The lone genius channel. Insight that requires the listener to catch up.',
  'Curiosity (11-56)':           'The storyteller. Translating ideas into sticky narrative.',
  'Awakening (10-20)':           'Self-loving behavior, communicated in the present. The channel of the now.',
  'Inspiration (1-8)':           'Creative expression that influences. The artist who has to be seen.',
  'The Prodigal (13-33)':        'Bearing witness. Holding the secrets others bring you.',
  'The Alpha (7-31)':            'Leadership through democracy. The voice the group wants.',
  'Money (21-45)':               'The will-to-control channel. Mastery over the material domain.',
  'Transitoriness (35-36)':      'The voice of change. Done, never going back.',
  'Openness (12-22)':            'Social sensitivity, expressed. The mood that fills a room.',
  'The Wave Length (16-48)':     'Talent through repetition. Mastery in performance.',
  'The Brain Wave (20-57)':      'Penetrating awareness in the now. Quick read of survival risk.',
  'Charisma (20-34)':            'Pure power expressed without forethought. Energy that arrives uninvited.',
  'The Beat (2-14)':             'Keys to the kingdom. Direction set by intuited timing.',
  'Rhythm (5-15)':               'A fixed pattern of being in the world. Habit as identity.',
  'Discovery (29-46)':           'Persistence and luck. Saying yes to the right things by accident.',
  'Exploration (10-34)':         'Following one\'s convictions. The principled experiment.',
  'Initiation (25-51)':          'Shock as awakening. Survival as initiation.',
  'Perfected Form (10-57)':      'Survival of the self. Intuition for one\'s own preservation.',
  'Surrender (26-44)':           'Memory-driven transmission. The salesman of the past.',
  'Community (37-40)':           'Loyalty and contract. The tribe held together by agreement.',
  'Power (34-57)':               'Intuition that empowers the body. Acting on the gut\'s read.',
  'Preservation (27-50)':        'Caretaking of the next generation. Stewardship of values.',
  'Mating (59-6)':                'Intimacy. Penetration of the other\'s emotional field.',
  'Mutation (3-60)':             'Change through acceptance of limits. Innovation under pressure.',
  'Concentration (9-52)':        'Focus channeled into the small details. Stillness at work.',
  'Maturation (42-53)':          'Beginnings completed. Cycles closed on time.',
  'Judgment (18-58)':            'Joy in correction. The channel that refines what\'s wrong.',
  'Transformation (32-54)':      'Ambition driven by fear. Climbing toward recognition.',
  'Struggle (28-38)':            'Stubbornness in service of meaning. The fight for what matters.',
  'Recognition (30-41)':         'Anticipation of feeling. Imagination as engine.',
  'Emoting (55-39)':             'Provocation of moods. The artist of feeling.',
  'Synthesis (19-49)':           'Sensitivity to need. The channel of the sensitive social being.',
};

export function channelMeaning(name: string, a: number, b: number): string {
  const key = `${name} (${a}-${b})`;
  return M[key] ?? M[`${name} (${b}-${a})`] ?? '';
}
