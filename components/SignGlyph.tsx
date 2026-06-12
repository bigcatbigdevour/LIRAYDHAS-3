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
  // Ram horns — two outward-curling arcs that meet at the bridge.
  Aries: (
    <>
      <path d="M5 16 C 5 9 8 6 12 6 C 16 6 19 9 19 16" />
      <path d="M5 16 C 5 12 7 10 9 10" />
      <path d="M19 16 C 19 12 17 10 15 10" />
    </>
  ),
  // Circle with V-horns.
  Taurus: (
    <>
      <circle cx="12" cy="15" r="5" />
      <path d="M5 8 C 7 5 10 5 12 8" />
      <path d="M19 8 C 17 5 14 5 12 8" />
    </>
  ),
  // Roman numeral II.
  Gemini: (
    <>
      <path d="M9 6 V 18" />
      <path d="M15 6 V 18" />
      <path d="M6 7 H 18" />
      <path d="M6 17 H 18" />
    </>
  ),
  // Two small circles with opposing curls (69 shape).
  Cancer: (
    <>
      <circle cx="8" cy="9" r="1.4" />
      <circle cx="16" cy="15" r="1.4" />
      <path d="M8 9 C 4 9 4 14 9 14 H 12" />
      <path d="M16 15 C 20 15 20 10 15 10 H 12" />
    </>
  ),
  // J-shape with sun (mane) circle.
  Leo: (
    <>
      <circle cx="9" cy="9" r="3" />
      <path d="M12 9 C 14 9 16 11 16 13 C 16 16 14 19 11 19 C 9 19 8 17 8 16" />
    </>
  ),
  // M with closing inward curl.
  Virgo: (
    <>
      <path d="M4 18 V 7 C 4 5.5 6 5.5 6 7 V 18" />
      <path d="M6 7 C 6 5.5 8 5.5 8 7 V 18" />
      <path d="M8 7 C 8 5.5 10 5.5 10 7 V 16" />
      <path d="M10 16 C 10 19 13 19 13 16 C 13 13 10 13 10 16" />
    </>
  ),
  // Horizontal line with curve above (scales).
  Libra: (
    <>
      <path d="M5 17 H 19" />
      <path d="M6 13 C 6 9 9 7 12 7 C 15 7 18 9 18 13" />
      <path d="M5 13 H 9" />
      <path d="M15 13 H 19" />
    </>
  ),
  // M with arrow tail.
  Scorpio: (
    <>
      <path d="M4 18 V 7 C 4 5.5 6 5.5 6 7 V 18" />
      <path d="M6 7 C 6 5.5 8 5.5 8 7 V 18" />
      <path d="M8 7 C 8 5.5 10 5.5 10 7 V 15 L 14 19" />
      <path d="M11 19 H 14 V 16" />
    </>
  ),
  // Arrow with diagonal slash.
  Sagittarius: (
    <>
      <path d="M5 19 L 19 5" />
      <path d="M14 5 H 19 V 10" />
      <path d="M9 11 L 13 15" />
    </>
  ),
  // V with curving tail.
  Capricorn: (
    <>
      <path d="M5 7 V 14 L 9 7 L 13 14 L 17 7 V 13" />
      <path d="M17 13 C 17 16 14 16 14 13 C 14 11 17 11 17 13" />
    </>
  ),
  // Two parallel wavy lines.
  Aquarius: (
    <>
      <path d="M5 10 L 8 8 L 11 10 L 14 8 L 17 10 L 19 8" />
      <path d="M5 15 L 8 13 L 11 15 L 14 13 L 17 15 L 19 13" />
    </>
  ),
  // Two opposing curves with horizontal line.
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
