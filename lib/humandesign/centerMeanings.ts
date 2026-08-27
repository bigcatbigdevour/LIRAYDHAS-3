// Short, plain-language description for each of the 9 HD centers.
// Used by the bodygraph's tap-to-expand interaction on /chart.

import type { CenterName } from '../types';

export const CENTER_MEANINGS: Record<CenterName, { name: string; defined: string; undefined: string }> = {
  Head: {
    name: 'Head — inspiration pressure',
    defined: 'Mental pressure flows down into thought. Inspiration comes through you as a constant signal.',
    undefined: 'Open to outside inspiration. The risk: thinking about questions that aren\'t actually yours.',
  },
  Ajna: {
    name: 'Ajna — conceptualization',
    defined: 'A fixed way of seeing and processing. Your mind has its own consistent shape.',
    undefined: 'Flexible thinker. The risk: pretending you are certain about things you haven\'t actually worked out.',
  },
  Throat: {
    name: 'Throat — manifestation',
    defined: 'Speech and expression have consistent access. What you say tends to land.',
    undefined: 'Quiet by design. The risk: speaking to get attention rather than because something needs to be said.',
  },
  G: {
    name: 'G — identity and direction',
    defined: 'A fixed sense of self. You know who you are and where you are going.',
    undefined: 'Identity is fluid, environment-shaped. The risk: anchoring identity to whoever you are around.',
  },
  Heart: {
    name: 'Heart — willpower',
    defined: 'You have access to willpower on demand. You can commit and follow through.',
    undefined: 'No consistent willpower. The risk: proving yourself by promising things you can\'t actually back.',
  },
  Sacral: {
    name: 'Sacral — life force',
    defined: 'A consistent, generative life force. Hard work feels right when responding to the right thing.',
    undefined: 'No consistent life force. The risk: not knowing when to stop. Sleep alone before bed.',
  },
  SolarPlexus: {
    name: 'Solar Plexus — emotional wave',
    defined: 'Emotions move in waves of their own. Wait for the wave to settle before deciding.',
    undefined: 'You amplify the room\'s emotions. The risk: mistaking absorbed emotion for your own.',
  },
  Spleen: {
    name: 'Spleen — intuition and survival',
    defined: 'Quiet, instant knowing. Health, safety, intuition all run through here continuously.',
    undefined: 'No constant intuition. The risk: holding on to things, people, or jobs past their expiration.',
  },
  Root: {
    name: 'Root — drive and stress',
    defined: 'A consistent pulse of stress and drive. You move things along.',
    undefined: 'No consistent pressure regulator. The risk: rushing to get rid of pressure that isn\'t actually yours.',
  },
};
