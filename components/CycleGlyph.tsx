/**
 * SVG glyph for a life cycle. Maps the cycle key onto the
 * corresponding PlanetGlyph (or Chiron / Node glyph) so the
 * application never has to render the Unicode astrology characters
 * inline — those render as full-color emoji on iOS Safari and break
 * the dark line-art interface.
 *
 * Drop-in replacement for the bare `{cycle.glyph}` text renders in
 * year / polarity / arcs pages.
 */

import PlanetGlyph from './PlanetGlyph';

const CYCLE_TO_PLANET: Record<string, string> = {
  solar: 'Sun',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  nodal: 'NorthNode',
  chiron: 'Chiron',
  lunarPg: 'Moon',
};

interface Props {
  cycleKey: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export default function CycleGlyph({ cycleKey, size = 13, className, strokeWidth }: Props) {
  const planet = CYCLE_TO_PLANET[cycleKey];
  if (!planet) return null;
  return <PlanetGlyph name={planet} size={size} className={className} strokeWidth={strokeWidth} />;
}
