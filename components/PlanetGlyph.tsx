/**
 * SVG icons for the planets + luminaries + nodes used across the app.
 *
 * Companion to SignGlyph — same rationale: Unicode astrology characters
 * render as Apple Color Emoji on iOS, wrong for a line-art interface.
 *
 * All shapes drawn at 24×24 viewBox, stroke = currentColor, single
 * `strokeWidth` knob. Fills are intentional (the Sun's center dot, the
 * Earth's cross) to differentiate at small sizes.
 */

import { memo } from 'react';

interface Props {
  name: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
  title?: string;
}

const PATHS: Record<string, React.ReactNode> = {
  // Sun — circle with center dot.
  Sun: (
    <>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  // Moon — waxing crescent.
  Moon: (
    <path d="M16 5 A 7 7 0 1 0 16 19 A 5.5 5.5 0 0 1 16 5 Z" />
  ),
  // Mercury — horns + circle + cross.
  Mercury: (
    <>
      <path d="M8 3 C 9 6 10 7 12 7 C 14 7 15 6 16 3" />
      <circle cx="12" cy="11" r="3.5" />
      <path d="M12 14.5 V 21" />
      <path d="M9 18 H 15" />
    </>
  ),
  // Venus — circle on top of cross.
  Venus: (
    <>
      <circle cx="12" cy="9" r="4.5" />
      <path d="M12 13.5 V 21" />
      <path d="M9 18 H 15" />
    </>
  ),
  // Mars — circle with arrow up-right.
  Mars: (
    <>
      <circle cx="10" cy="14" r="4.5" />
      <path d="M13 11 L 20 4" />
      <path d="M15 4 H 20 V 9" />
    </>
  ),
  // Jupiter — a 4-shape with a slash.
  Jupiter: (
    <>
      <path d="M6 7 H 13 V 17" />
      <path d="M9 12 C 7 12 6 14 6 16 C 6 18 8 18 10 17" />
      <path d="M13 17 H 18" />
    </>
  ),
  // Saturn — h with cross-stroke and ball.
  Saturn: (
    <>
      <path d="M6 4 V 17" />
      <path d="M4 7 H 9" />
      <path d="M6 17 C 6 14 9 12 12 12 C 15 12 16 15 16 17" />
      <circle cx="16" cy="17" r="2" />
    </>
  ),
  // Uranus — circle with vertical line and two side horns + bottom cross.
  Uranus: (
    <>
      <path d="M12 4 V 14" />
      <path d="M7 4 V 14" />
      <path d="M17 4 V 14" />
      <path d="M7 9 H 17" />
      <circle cx="12" cy="18" r="2.5" />
    </>
  ),
  // Neptune — trident.
  Neptune: (
    <>
      <path d="M12 3 V 16" />
      <path d="M5 5 V 10 C 5 14 8 16 12 16 C 16 16 19 14 19 10 V 5" />
      <path d="M8 16 H 16" />
      <path d="M12 18 V 21" />
    </>
  ),
  // Pluto — circle on top of crescent above cross.
  Pluto: (
    <>
      <circle cx="12" cy="7" r="2.5" />
      <path d="M7 13 C 7 9 9 7 12 7 C 15 7 17 9 17 13" />
      <path d="M12 13 V 21" />
      <path d="M9 17 H 15" />
    </>
  ),
  // Chiron — circle stacked on K-shape (key/wand).
  Chiron: (
    <>
      <circle cx="14" cy="16" r="3" />
      <path d="M14 13 V 4" />
      <path d="M14 4 L 9 8" />
      <path d="M14 7 L 9 11" />
    </>
  ),
  // Earth — circle with cross.
  Earth: (
    <>
      <circle cx="12" cy="12" r="7" />
      <path d="M5 12 H 19" />
      <path d="M12 5 V 19" />
    </>
  ),
  // North Node — horseshoe up.
  NorthNode: (
    <>
      <path d="M5 19 C 5 11 9 7 12 7 C 15 7 19 11 19 19" />
      <circle cx="5" cy="20" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="20" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  // South Node — horseshoe down.
  SouthNode: (
    <>
      <path d="M5 5 C 5 13 9 17 12 17 C 15 17 19 13 19 5" />
      <circle cx="5" cy="4" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="4" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
};

function PlanetGlyphBase({ name, size = 16, strokeWidth = 1.4, className, title }: Props) {
  const node = PATHS[name];
  if (!node) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {node}
    </svg>
  );
}

const PlanetGlyph = memo(PlanetGlyphBase);
export default PlanetGlyph;

/**
 * Returns the raw path nodes for a planet so they can be inlined inside
 * another SVG (NatalWheel, SkyVisual). The shapes are in a 24×24
 * viewBox — wrap in <g transform="translate(...) scale(...)" /> to
 * position. Returns null for unknown names.
 */
export function planetGlyphPaths(name: string): React.ReactNode {
  return PATHS[name] ?? null;
}
