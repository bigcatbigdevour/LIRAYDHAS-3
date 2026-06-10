/**
 * Fixed palette of tags for saved entries.
 *
 * Why fixed: free-form tags become a mess fast — "happy", "Happy", "feeling
 * happy", "happy :)" all stack as distinct facets. A curated palette keeps
 * the journal scannable, lets us prebuild a chip UI without an autocomplete
 * step, and ensures the writing stays in the brand voice (no "vibes",
 * "energy", "manifest").
 *
 * Each tag is a single lowercase word that describes the *texture* of a
 * day — what it felt like to be in it, not what happened. Add sparingly:
 * every new tag is a label the user has to scan over forever.
 */
export const TAG_PALETTE = [
  'clear',
  'heavy',
  'tender',
  'charged',
  'quiet',
  'raw',
  'turning',
  'open',
  'closing',
  'edged',
  'soft',
  'ordinary',
] as const;

export type Tag = typeof TAG_PALETTE[number];

/**
 * Brief descriptions for accessibility / tooltips. Keep one short line each.
 */
export const TAG_DESCRIPTIONS: Record<Tag, string> = {
  clear:    'lucid, decided, the day knew what it was',
  heavy:    'weight you carried without naming it',
  tender:   'soft places that asked to be noticed',
  charged:  'electric, kinetic, more than one signal at once',
  quiet:    'low frequency, ordinary, easy to underrate',
  raw:      'feeling close to the surface, defenses down',
  turning:  'something shifted that you may only see later',
  open:     'permission, room to move, less fence',
  closing:  'an ending you can feel, even if it isn\'t done',
  edged:    'sharp, friction, the day tested something',
  soft:     'permission to be slow, take less',
  ordinary: 'no event — and that itself was the day',
};

export function isValidTag(t: string): t is Tag {
  return (TAG_PALETTE as readonly string[]).includes(t);
}
