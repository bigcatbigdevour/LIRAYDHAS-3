'use client';

import type { Blueprint, PlanetName } from '@/lib/types';

const SIGNS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const GLYPH: Partial<Record<PlanetName, string>> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  NorthNode: '☊', Chiron: '⚷',
};

interface Body { name: PlanetName; lon: number }

export default function NatalWheel({ blueprint }: { blueprint: Blueprint }) {
  const n = blueprint.natal;
  const bodies: Body[] = [
    { name: 'Sun', lon: n.sun.longitude },
    { name: 'Moon', lon: n.moon.longitude },
    { name: 'Mercury', lon: n.mercury.longitude },
    { name: 'Venus', lon: n.venus.longitude },
    { name: 'Mars', lon: n.mars.longitude },
    { name: 'Jupiter', lon: n.jupiter.longitude },
    { name: 'Saturn', lon: n.saturn.longitude },
    { name: 'Uranus', lon: n.uranus.longitude },
    { name: 'Neptune', lon: n.neptune.longitude },
    { name: 'Pluto', lon: n.pluto.longitude },
    { name: 'NorthNode', lon: n.northNode.longitude },
  ];
  if (n.chiron) bodies.push({ name: 'Chiron', lon: n.chiron.longitude });

  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = 150;
  const rRing = 132;
  const rPlanet = 108;
  const rInner = 60;

  // Houses are rotated so ASC is at the 9 o'clock (left) position.
  const ascOffset = n.asc ?? 0;

  function point(lon: number, r: number) {
    // Rotate so ASC sits at left (theta = 180°)
    const rel = ((lon - ascOffset) + 360) % 360;
    const theta = ((180 - rel) * Math.PI) / 180;
    return { x: cx + r * Math.cos(theta), y: cy - r * Math.sin(theta) };
  }

  const placed = layout(bodies, 6);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[360px]">
      <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke="#222" strokeWidth="0.6" />
      <circle cx={cx} cy={cy} r={rRing}  fill="none" stroke="#222" strokeWidth="0.4" />
      <circle cx={cx} cy={cy} r={rInner} fill="none" stroke="#222" strokeWidth="0.4" />

      {/* 12 zodiac dividers */}
      {Array.from({ length: 12 }).map((_, i) => {
        const lon = i * 30;
        const a = point(lon, rRing);
        const b = point(lon, rOuter);
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#1c1c1c" strokeWidth="0.4" />;
      })}

      {/* sign glyphs */}
      {SIGNS.map((g, i) => {
        const mid = point(i * 30 + 15, (rOuter + rRing) / 2);
        return (
          <text key={i} x={mid.x} y={mid.y + 3} textAnchor="middle" fontSize="9" fill="#666" fontFamily="serif">{g}</text>
        );
      })}

      {/* house cusps */}
      {n.houses.every((h) => h != null) && (n.houses as number[]).map((cusp, i) => {
        const a = point(cusp, rInner);
        const b = point(cusp, rRing);
        const isAngle = i === 0 || i === 3 || i === 6 || i === 9;
        return (
          <line key={`h${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={isAngle ? '#555' : '#222'}
                strokeWidth={isAngle ? 0.8 : 0.4} />
        );
      })}

      {/* aspect lines */}
      {aspectLines(bodies).map((seg, i) => {
        const a = point(seg.aLon, rInner - 4);
        const b = point(seg.bLon, rInner - 4);
        return (
          <line
            key={`a${i}`}
            x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke={seg.color}
            strokeWidth="0.4"
            opacity="0.7"
          />
        );
      })}

      {/* planets */}
      {placed.map((p) => {
        const pos = point(p.adjustedLon, rPlanet);
        return (
          <g key={p.name}>
            <line
              x1={point(p.lon, rRing - 4).x}
              y1={point(p.lon, rRing - 4).y}
              x2={point(p.lon, rRing - 12).x}
              y2={point(p.lon, rRing - 12).y}
              stroke="#3a3a3a"
              strokeWidth="0.5"
            />
            <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="13" fill="#f4f1ea">
              {GLYPH[p.name] ?? '·'}
            </text>
          </g>
        );
      })}

      {/* ASC marker */}
      {n.asc !== null && (
        <text
          x={point(n.asc, rOuter + 12).x}
          y={point(n.asc, rOuter + 12).y + 3}
          textAnchor="middle" fontSize="9" fill="#8b3a3a"
        >ASC</text>
      )}
    </svg>
  );
}

interface Placed extends Body { adjustedLon: number }
function layout(items: Body[], minGap = 6): Placed[] {
  const sorted = [...items].sort((a, b) => a.lon - b.lon);
  const adj = sorted.map((p) => ({ ...p, adjustedLon: p.lon }));
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 1; i < adj.length; i++) {
      const gap = adj[i].adjustedLon - adj[i - 1].adjustedLon;
      if (gap < minGap) {
        const push = (minGap - gap) / 2;
        adj[i - 1].adjustedLon -= push;
        adj[i].adjustedLon += push;
      }
    }
  }
  return adj;
}

function aspectLines(bodies: Body[]) {
  const aspects = [
    { a: 0, orb: 6, color: '#8b3a3a' },     // conjunction (red)
    { a: 60, orb: 4, color: '#3a7a52' },    // sextile (green)
    { a: 90, orb: 6, color: '#8b3a3a' },    // square (red)
    { a: 120, orb: 5, color: '#3a7a52' },   // trine (green)
    { a: 180, orb: 6, color: '#666' },      // opposition (grey)
  ];
  const out: { aLon: number; bLon: number; color: string }[] = [];
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const d = Math.abs(bodies[i].lon - bodies[j].lon) % 360;
      const sep = d > 180 ? 360 - d : d;
      for (const asp of aspects) {
        if (Math.abs(sep - asp.a) <= asp.orb) {
          out.push({ aLon: bodies[i].lon, bLon: bodies[j].lon, color: asp.color });
          break;
        }
      }
    }
  }
  return out;
}
