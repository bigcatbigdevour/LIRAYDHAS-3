'use client';

/**
 * A ghostly sacred-geometry layer: a repeating flower-of-life pattern
 * overlaid with a single central Metatron-style figure. Rendered as
 * fixed, non-interactive SVG so it sits behind everything else.
 *
 * Opacity is intentionally tiny — this should be almost subliminal.
 */
export default function SacredGeometry() {
  return (
    <div className="geometry-layer" aria-hidden="true">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1200 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Flower-of-life tile — seven overlapping circles. */}
          <pattern
            id="flower"
            x="0"
            y="0"
            width="120"
            height="104"
            patternUnits="userSpaceOnUse"
          >
            <g
              stroke="#1f3a8a"
              strokeWidth="0.45"
              fill="none"
              opacity="0.09"
            >
              <circle cx="60" cy="52" r="30" />
              <circle cx="30" cy="0" r="30" />
              <circle cx="90" cy="0" r="30" />
              <circle cx="0" cy="52" r="30" />
              <circle cx="120" cy="52" r="30" />
              <circle cx="30" cy="104" r="30" />
              <circle cx="90" cy="104" r="30" />
            </g>
          </pattern>
          <radialGradient id="vignette" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
          </radialGradient>
        </defs>

        {/* Tiled flower of life. */}
        <rect width="100%" height="100%" fill="url(#flower)" />

        {/* Soft white vignette so the edges fade. */}
        <rect width="100%" height="100%" fill="url(#vignette)" />

        {/* Central Metatron-ish figure — 13 circles + star lines. */}
        <g
          transform="translate(600 450)"
          stroke="#1f3a8a"
          strokeWidth="0.5"
          fill="none"
          opacity="0.09"
        >
          {metatronCircles().map((c, i) => (
            <circle key={`c${i}`} cx={c.x} cy={c.y} r="36" />
          ))}
          {metatronLines().map((l, i) => (
            <line
              key={`l${i}`}
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
            />
          ))}
          {/* Outer ring */}
          <circle cx="0" cy="0" r="210" strokeWidth="0.35" />
          <circle cx="0" cy="0" r="170" strokeWidth="0.3" />
        </g>

        {/* A second, very faint horizontal band of seed-of-life. */}
        <g
          transform="translate(600 450)"
          stroke="#1f3a8a"
          strokeWidth="0.4"
          fill="none"
          opacity="0.055"
        >
          {seedOfLife().map((c, i) => (
            <circle key={`s${i}`} cx={c.x} cy={c.y} r="72" />
          ))}
        </g>
      </svg>
    </div>
  );
}

function metatronCircles() {
  const r = 72;
  const pts: { x: number; y: number }[] = [{ x: 0, y: 0 }];
  // inner hexagon
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  // outer hexagon
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push({ x: Math.cos(a) * r * 2, y: Math.sin(a) * r * 2 });
  }
  return pts;
}

function metatronLines() {
  const pts = metatronCircles();
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  // Connect every point to every other point — the classic overlay.
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      lines.push({
        x1: pts[i].x,
        y1: pts[i].y,
        x2: pts[j].x,
        y2: pts[j].y,
      });
    }
  }
  return lines;
}

function seedOfLife() {
  const r = 72;
  const pts: { x: number; y: number }[] = [{ x: 0, y: 0 }];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  return pts;
}
