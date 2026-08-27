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
  // Aries — the ram. Classical glyph: a single fluid Y where the
  // stem is the bridge of the face and the two arms curl outward
  // and down into spirals. Both horns drawn as one continuous curve
  // per side so the line never looks broken at small sizes.
  Aries: (
    <>
      <path d="M12 19 V 9 C 12 7 11 6 9 6 C 6.5 6 5 8 5 10.5 C 5 12 6 13 7.5 13" />
      <path d="M12 9 C 12 7 13 6 15 6 C 17.5 6 19 8 19 10.5 C 19 12 18 13 16.5 13" />
    </>
  ),
  // Taurus — the bull. A round disc with a graceful crescent (horns)
  // resting on top, drawn as one smooth U-shape. Geometric and
  // immediately readable.
  Taurus: (
    <>
      <circle cx="12" cy="15" r="4.5" />
      <path d="M5.5 8.5 C 6 5 9.5 5 12 8 C 14.5 5 18 5 18.5 8.5" />
    </>
  ),
  // Gemini — the twins. The Roman II with serif top + bottom.
  // Slightly tighter spacing than Unicode's default reads cleaner at
  // small sizes.
  Gemini: (
    <>
      <path d="M9.5 6 V 18" />
      <path d="M14.5 6 V 18" />
      <path d="M7 6.5 H 17" />
      <path d="M7 17.5 H 17" />
    </>
  ),
  // Cancer — the crab. Two small filled discs with curling arms that
  // wrap around each other — a 69 form. The connecting arms cross
  // through the centre so the figure reads as ONE shape, not two.
  Cancer: (
    <>
      <circle cx="7.5" cy="10" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="14" r="1.6" fill="currentColor" stroke="none" />
      <path d="M7.5 10 C 5 10 3.5 11.5 3.5 13.5 C 3.5 16 6 17 9 16.5 C 12 16 14.5 14.5 16.5 14" />
      <path d="M16.5 14 C 19 14 20.5 12.5 20.5 10.5 C 20.5 8 18 7 15 7.5 C 12 8 9.5 9.5 7.5 10" />
    </>
  ),
  // Leo — the lion. One continuous stroke: small loop (the mane)
  // descending into a long flowing S-tail. The loop sits in the
  // upper-left so the eye reads it first, then follows the tail down
  // and around.
  Leo: (
    <>
      <path d="M9 13 C 6.5 13 6 10 7.5 8 C 9.5 5.5 13 6 13.5 9 C 14 11.5 12.5 13 14.5 14.5 C 17 16.5 17.5 19 15.5 19.5 C 13.5 19.8 12 18 12 16" />
    </>
  ),
  // Virgo — the maiden. Three M-peaks then a closing inward spiral.
  // Drawn as one continuous polyline + a closing loop so the spiral
  // visibly attaches to the third peak.
  Virgo: (
    <>
      <path d="M4 18 V 8.5 C 4 6.8 5.5 6.8 5.5 8.5 V 18 V 8.5 C 5.5 6.8 7 6.8 7 8.5 V 18 V 8.5 C 7 6.8 8.5 6.8 8.5 8.5 V 16" />
      <path d="M8.5 16 C 8.5 18 11 19 13 17.5 C 15 16 15 13 13 12 C 11.5 11.2 10 12 10 13.5 C 10 14.5 11 15 12 14.5" />
    </>
  ),
  // Libra — the scales. Horizon line below, a rising arch above
  // resting on a shorter shelf. Reads as a sun cresting a horizon.
  Libra: (
    <>
      <path d="M4 18 H 20" />
      <path d="M5 13 H 9.5 C 9.5 10 10.5 8 12 8 C 13.5 8 14.5 10 14.5 13 H 19" />
    </>
  ),
  // Scorpio — the scorpion. Three M-peaks ending in a diagonal stroke
  // to a barbed arrowhead at the bottom-right. The barb is two
  // strokes so it reads as a hook, not a triangle.
  Scorpio: (
    <>
      <path d="M4 18 V 8.5 C 4 6.8 5.5 6.8 5.5 8.5 V 18 V 8.5 C 5.5 6.8 7 6.8 7 8.5 V 18 V 8.5 C 7 6.8 8.5 6.8 8.5 8.5 V 16 L 12.5 20" />
      <path d="M9.5 20 H 12.5 V 17" />
    </>
  ),
  // Sagittarius — the archer. Diagonal arrow from lower-left to
  // upper-right with an arrowhead at the tip and a crossbar through
  // the shaft. The crossbar is offset toward the tail end like the
  // classical glyph, not centered.
  Sagittarius: (
    <>
      <path d="M5 19 L 19 5" />
      <path d="M14 5 H 19 V 10" />
      <path d="M8.5 11 L 13 15.5" />
    </>
  ),
  // Capricorn — the sea-goat. A clean V (the goat horns) flowing
  // into a looping fish tail on the right. The whole figure is two
  // strokes: the V-and-descent, then the closed loop of the tail.
  Capricorn: (
    <>
      <path d="M5 8 V 13 C 5 15.5 7.5 15.5 8.5 13 L 11 7.5 L 13.5 13.5 C 14 14.5 15 15 16 14.5" />
      <path d="M16 14.5 C 18.5 13 20 15.5 18 17.5 C 16 19 13.5 17.5 13.5 15 C 13.5 13.5 15 13 16 14.5 Z" />
    </>
  ),
  // Aquarius — the water-bearer. Two clean wavy lines, both with a
  // matched amplitude so they read as parallel. Smoothed corners
  // (curved peaks/valleys) instead of sharp zigzag.
  Aquarius: (
    <>
      <path d="M4 11 Q 6.25 8 8.5 11 T 13 11 T 17.5 11 Q 19 9.5 20 9" />
      <path d="M4 16 Q 6.25 13 8.5 16 T 13 16 T 17.5 16 Q 19 14.5 20 14" />
    </>
  ),
  // Pisces — two fish swimming opposite directions, joined by a
  // central bar. Both crescents are mirror-symmetric C-curves; the
  // bar sits at the vertical midpoint and connects their bellies.
  Pisces: (
    <>
      <path d="M6.5 5 C 4 8.5 4 15.5 6.5 19" />
      <path d="M17.5 5 C 20 8.5 20 15.5 17.5 19" />
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
