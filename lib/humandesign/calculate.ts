// Top-level: compute the full Human Design blueprint from a birth UTC datetime.

import type { HumanDesign } from '../types';
import {
  computeActivations,
  findDesignTime,
} from '../astrology/natal';
import {
  activationsToGates,
  deriveHumanDesign,
} from './derive';

export interface HDInputs {
  birthUtc: Date;
}

export function computeHumanDesign({ birthUtc }: HDInputs): HumanDesign {
  const personalityAct = computeActivations(birthUtc);
  const designUtc = findDesignTime(birthUtc);
  const designAct = computeActivations(designUtc);

  const personality = activationsToGates(personalityAct, 'personality');
  const design = activationsToGates(designAct, 'design');
  return deriveHumanDesign(personality, design);
}
