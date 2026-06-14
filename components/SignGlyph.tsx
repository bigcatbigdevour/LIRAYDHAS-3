/**
 * SVG icons for the 12 zodiac signs.
 *
 * iOS Safari and macOS render Unicode astrology characters (♈ ♉ etc.)
 * as full-color emoji from the Apple Color Emoji font — wrong for a
 * dark-mode line-art interface. These SVG glyphs render the classical
 * shapes in a single stroke color (currentColor), so they pick up the
 * surrounding text color and look like part of the typography.
 *
 * Each glyph is drawn in a 24×24 viewBox with thin strokes (1.4–1.6 px
 * at native size). Designed to read at sizes 12 → 32 px. For sizes
 * above 32 the strokes start to look thin — pass strokeWidth higher.
 */

import { memo } from 'react';
import type { ZodiacSign } from '@/lib/types';

interface Props {
  sign: ZodiacSign | string;
  size?: number;
  strokeWidth?: number;
  className?: string;
  title?: string;
}

const PATHS: Record<string, React.ReactNode> = {
  // Aries — the ram. Two outward-curling horns meeting at a central
  // bridge. Classical glyph: a V at the top with the arms curling down
  // and outward into spirals.
  Aries: (
    <>
      <path d="M12 18 V 9" />
      <path d="M12 9 C 12 6 9 5 7 6 C 5 7 4 10 4 13 C 4 11 5.5 9.5 7.5 9.5" />
      <path d="M12 9 C 12 6 15 5 17 6 C 19 7 20 10 20 13 C 20 11 18.5 9.5 16.5 9.5" />
    </>
  ),
  // Taurus — the bull. Disc below, crescent (horns) cradling above.
  // Classical: a perfect circle with a U-shaped crescent resting on it.
  Taurus: (
    <>
      <circle cx="12" cy="15" r="4.5" />
      <path d="M5 9 C 5 5.5 8.5 5 12 8 C 15.5 5 19 5.5 19 9" />
    </>
  ),
  // Gemini — the twins. Roman II with serif-like bars top and bottom.
  Gemini: (
    <>
      <path d="M9 6 V 18" />
      <path d="M15 6 V 18" />
      <path d="M6.5 6 H 17.5" />
      <path d="M6.5 18 H 17.5" />
    </>
  ),
  // Cancer — the crab. A 69 shape: two small filled discs with curling
  // arms that wrap around each other.
  Cancer: (
    <>
      <circle cx="7.5" cy="10" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="14" r="1.5" fill="currentColor" stroke="none" />
      <path d="M7.5 10 C 5 10 4 12 4 13 C 4 15 6 16.5 9 16.5 C 12 16.5 14.5 15.5 16 14" />
      <path d="M16.5 14 C 19 14 20 12 20 11 C 20 9 18 7.5 15 7.5 C 12 7.5 9.5 8.5 8 10" />
    </>
  ),
  // Leo — the lion. A loop (mane / heart) flowing into a long S-curve
  // tail. Classical glyph: small circle joined to a sweeping J.
  Leo: (
    <>
      <path d="M7 11 C 7 8 9 6 11 6 C 13 6 14 8 14 10 C 14 11 13.5 11.5 13 12 L 16 15 C 18 17 18 19 16 19 C 14 19 12 17 12 15" />
    </>
  ),
  // Virgo — the maiden. Three M peaks with a closing inward-curling
  // tail, ending in a loop. Classical glyph: ♍.
  Virgo: (
    <>
      <path d="M4 18 V 8 C 4 6 6 6 6 8 V 18" />
      <path d="M6 8 C 6 6 8 6 8 8 V 18" />
      <path d="M8 8 C 8 6 10 6 10 8 V 16 C 10 18 12 19 14 18 C 16 17 17 14 15 12 C 13 10 11 12 12 14" />
    </>
  ),
  // Libra — the scales. A horizontal base line with a rising sun /
  // half-disc above it, sitting on a shorter top line. Classical: a Ω
  // with a horizontal line beneath.
  Libra: (
    <>
      <path d="M4 18 H 20" />
      <path d="M5 13 H 9 C 9 10 10.5 8 12 8 C 13.5 8 15 10 15 13 H 19" />
    </>
  ),
  // Scorpio — the scorpion. Three M peaks (like Virgo) but ending in a
  // sharp arrow tail at the bottom-right instead of a closing curl.
  Scorpio: (
    <>
      <path d="M4 18 V 8 C 4 6 6 6 6 8 V 18" />
      <path d="M6 8 C 6 6 8 6 8 8 V 18" />
      <path d="M8 8 C 8 6 10 6 10 8 V 16 L 14 20" />
      <path d="M11 20 H 14 V 17" />
    </>
  ),
  // Sagittarius — the archer. Diagonal arrow with a crossbar through
  // the shaft.
  Sagittarius: (
    <>
      <path d="M5 19 L 19 5" />
      <path d="M14 5 H 19 V 10" />
      <path d="M9 11 L 13 15" />
    </>
  ),
  // Capricorn — the sea-goat. A V (goat horns) descending into a loop
  // tail (fish). Classical: ♑ with the looping fish-tail on the right.
  Capricorn: (
    <>
      <path d="M5 8 V 13 C 5 16 8 16 9 13 L 11 8 L 13 13 C 13.5 14.5 14.5 15 16 14" />
      <path d="M16 14 C 18 13 19 15 18 16.5 C 17 18 14.5 18 14 16 C 13.7 14.7 14.5 14 16 14" />
    </>
  ),
  // Aquarius — the water-bearer. Two parallel waves.
  Aquarius: (
    <>
      <path d="M5 10 L 8 8 L 11 10 L 14 8 L 17 10 L 19 8" />
      <path d="M5 15 L 8 13 L 11 15 L 14 13 L 17 15 L 19 13" />
    </>
  ),
  // Pisces — two fish. Two opposing crescents joined by a horizontal
  // line through the middle.
  Pisces: (
    <>
      <path d="M6 5 C 4 9 4 15 6 19" />
      <path d="M18 5 C 20 9 20 15 18 19" />
      <path d="M7 12 H 17" />
    </>
  ),
};

function SignGlyphBase({ sign, size = 16, strokeWidth = 1.4, className, title }: Props) {
  const node = PATHS[sign];
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

const SignGlyph = memo(SignGlyphBase);
export default SignGlyph;

/**
 * Returns the raw path nodes for a sign so they can be inlined inside
 * another SVG (e.g. NatalWheel, SkyVisual). The path data is drawn in
 * a 24×24 viewBox — wrap in a <g transform="translate(...) scale(...)" />
 * to position. Returns null for unknown signs.
 */
export function signGlyphPaths(sign: ZodiacSign | string): React.ReactNode {
  return PATHS[sign] ?? null;
}
