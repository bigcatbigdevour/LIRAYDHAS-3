'use client';

/**
 * Small moon-phase glyph rendered as SVG. `phase` is the ecliptic separation
 * of moon from sun, 0..360 (0 = new, 180 = full).
 */
export default function MoonIcon({ phase, size = 18 }: { phase: number; size?: number }) {
  const r = size / 2 - 1;
  const cx = size / 2;
  const cy = size / 2;

  // Width of the illuminated portion across the disk, normalized to [-r, r].
  // x = r * cos(phase). Negative x = waxing (right half lit), positive x = waning (left half lit).
  const x = r * Math.cos((phase * Math.PI) / 180);
  const waxing = phase < 180;
  // Terminator is an ellipse with horizontal radius |x|; if illum > 0.5, the
  // ellipse is "outside" the lit half; if < 0.5, inside. Use two arcs.

  const sweepLit = waxing ? 0 : 1;
  const lit = `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${waxing ? 1 : 0} ${cx} ${cy + r} A ${Math.abs(x)} ${r} 0 0 ${sweepLit} ${cx} ${cy - r} Z`;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#555" strokeWidth="0.7" />
      <path d={lit} fill="#f4f1ea" />
    </svg>
  );
}
