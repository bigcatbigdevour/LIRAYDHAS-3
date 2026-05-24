'use client';

import { useMemo } from 'react';
import type { Blueprint, PlanetName } from '@/lib/types';
import { todaysTransits } from '@/lib/astrology/transits';

const SIGNS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const GLYPH: Record<PlanetName, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  NorthNode: '☊', SouthNode: '☋', Chiron: '⚷', Earth: '⊕',
};

const ORDER: PlanetName[] = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
];

export default function SkyVisual({ blueprint }: { blueprint: Blueprint }) {
  const { transits } = useMemo(() => {
    const t = todaysTransits(blueprint.natal);
    return { transits: t };
  }, [blueprint]);

  // Use 360 viewBox; the chart rotates so 0° (Aries) is on the left (9 o'clock).
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const outer = 150;
  const ring = 132;
  const planetR = 108;
  const natalSun = blueprint.natal.sun.longitude;

  // Convert ecliptic longitude → SVG angle so that 0° Aries is at left, going CCW.
  // Polar: x = cx + r * cos(theta), y = cy - r * sin(theta).
  // theta_radians = (180 - longitude) * π/180  (so 0° lon → 180° → left)
  function point(lon: number, r: number) {
    const theta = ((180 - lon) * Math.PI) / 180;
    return { x: cx + r * Math.cos(theta), y: cy - r * Math.sin(theta) };
  }

  // Avoid label overlaps by walking around the ring once.
  const positions = ORDER.map((p) => ({
    name: p,
    lon: transits.positions[p],
  })).filter((p) => p.lon !== undefined && p.lon >= 0);

  const placed = layout(positions, 6);

  return (
    <div className="my-6">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full max-w-[420px] mx-auto block"
      >
        {/* outer ring */}
        <circle cx={cx} cy={cy} r={outer} fill="none" stroke="#1c1c1c" strokeWidth="0.5" />
        <circle cx={cx} cy={cy} r={ring} fill="none" stroke="#222" strokeWidth="0.5" />
        {/* 12 sign divisions */}
        {Array.from({ length: 12 }).map((_, i) => {
          const lon = i * 30;
          const a = point(lon, ring);
          const b = point(lon, outer);
          return (
            <line
              key={i}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="#1c1c1c"
              strokeWidth="0.4"
            />
          );
        })}
        {/* sign glyphs at midpoints */}
        {SIGNS.map((g, i) => {
          const mid = point(i * 30 + 15, (outer + ring) / 2);
          return (
            <text
              key={i}
              x={mid.x}
              y={mid.y + 3}
              textAnchor="middle"
              fontSize="9"
              fill="#666"
              fontFamily="serif"
            >
              {g}
            </text>
          );
        })}
        {/* tick marks every 10° */}
        {Array.from({ length: 36 }).map((_, i) => {
          const lon = i * 10;
          const a = point(lon, ring);
          const b = point(lon, ring - 3);
          return (
            <line
              key={`t${i}`}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="#333"
              strokeWidth="0.4"
            />
          );
        })}
        {/* natal Sun marker on ring */}
        {(() => {
          const a = point(natalSun, ring);
          const b = point(natalSun, outer);
          return (
            <line
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="#8b3a3a"
              strokeWidth="1.4"
            />
          );
        })()}
        {/* planet glyphs */}
        {placed.map((p) => {
          const pos = point(p.adjustedLon, planetR);
          return (
            <g key={p.name}>
              <line
                x1={point(p.lon, ring - 4).x}
                y1={point(p.lon, ring - 4).y}
                x2={point(p.lon, ring - 12).x}
                y2={point(p.lon, ring - 12).y}
                stroke="#3a3a3a"
                strokeWidth="0.5"
              />
              <text
                x={pos.x}
                y={pos.y + 4}
                textAnchor="middle"
                fontSize="12"
                fill="#f4f1ea"
              >
                {GLYPH[p.name]}
              </text>
            </g>
          );
        })}
        {/* center dot */}
        <circle cx={cx} cy={cy} r="1" fill="#888" />
      </svg>
      <p className="text-center small-label mt-2">
        sky now &nbsp; · &nbsp; <span style={{ color: '#8b3a3a' }}>natal sun</span>
      </p>
    </div>
  );
}

interface Placed { name: PlanetName; lon: number; adjustedLon: number }

function layout(items: { name: PlanetName; lon: number }[], minGap = 6): Placed[] {
  const sorted = [...items].sort((a, b) => a.lon - b.lon);
  const adjusted = sorted.map((p) => ({ ...p, adjustedLon: p.lon }));
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 1; i < adjusted.length; i++) {
      const prev = adjusted[i - 1];
      const cur = adjusted[i];
      const gap = cur.adjustedLon - prev.adjustedLon;
      if (gap < minGap) {
        const push = (minGap - gap) / 2;
        prev.adjustedLon -= push;
        cur.adjustedLon += push;
      }
    }
  }
  return adjusted;
}
