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

  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const outer = 150;
  const ring = 132;
  const planetR = 108;
  const natalR = 80;

  const n = blueprint.natal;
  const natalLongitudes: { name: PlanetName; lon: number }[] = [
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
  ];

  function point(lon: number, r: number) {
    const theta = ((180 - lon) * Math.PI) / 180;
    return { x: cx + r * Math.cos(theta), y: cy - r * Math.sin(theta) };
  }

  const positions = ORDER.map((p) => ({
    name: p,
    lon: transits.positions[p],
  })).filter((p) => p.lon !== undefined && p.lon >= 0);

  const placed = layout(positions, 6);
  const natalPlaced = layout(natalLongitudes, 6);

  return (
    <div className="my-6">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full max-w-[420px] mx-auto block"
      >
        {/* outer ring */}
        <circle cx={cx} cy={cy} r={outer} fill="none" stroke="#1c1c1c" strokeWidth="0.5" />
        <circle cx={cx} cy={cy} r={ring} fill="none" stroke="#222" strokeWidth="0.5" />
        <circle cx={cx} cy={cy} r={natalR} fill="none" stroke="#222" strokeWidth="0.3" strokeDasharray="2 3" />
        {/* 12 sign divisions */}
        {Array.from({ length: 12 }).map((_, i) => {
          const lon = i * 30;
          const a = point(lon, ring);
          const b = point(lon, outer);
          return (
            <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="#1c1c1c" strokeWidth="0.4" />
          );
        })}
        {/* sign glyphs at midpoints */}
        {SIGNS.map((g, i) => {
          const mid = point(i * 30 + 15, (outer + ring) / 2);
          return (
            <text key={i} x={mid.x} y={mid.y + 3} textAnchor="middle"
              fontSize="9" fill="#666" fontFamily="serif">
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
            <line key={`t${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="#333" strokeWidth="0.4" />
          );
        })}
        {/* natal sun marker on outer ring */}
        {(() => {
          const a = point(n.sun.longitude, ring);
          const b = point(n.sun.longitude, outer);
          return (
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="#8b3a3a" strokeWidth="1.6" />
          );
        })()}
        {/* faint natal planet ghosts on inner dashed ring */}
        {natalPlaced.map((p) => {
          const pos = point(p.adjustedLon, natalR);
          return (
            <text
              key={`nat-${p.name}`}
              x={pos.x} y={pos.y + 3.5}
              textAnchor="middle"
              fontSize="9.5"
              fill="#555"
              fontFamily="serif"
            >
              {GLYPH[p.name]}
            </text>
          );
        })}
        {/* planet glyphs — today's */}
        {placed.map((p) => {
          const pos = point(p.adjustedLon, planetR);
          const isClose = isHittingNatal(p.lon, natalLongitudes);
          return (
            <g key={p.name}>
              <line
                x1={point(p.lon, ring - 4).x} y1={point(p.lon, ring - 4).y}
                x2={point(p.lon, ring - 12).x} y2={point(p.lon, ring - 12).y}
                stroke={isClose ? '#8b3a3a' : '#3a3a3a'}
                strokeWidth={isClose ? 0.9 : 0.5}
              />
              <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="12.5" fill="#f4f1ea">
                {GLYPH[p.name]}
              </text>
            </g>
          );
        })}
        {/* center dot */}
        <circle cx={cx} cy={cy} r="1" fill="#888" />
      </svg>
      <div className="flex justify-center gap-4 mt-2 text-[10px]" style={{ letterSpacing: '0.18em' }}>
        <span className="text-ink">● sky now</span>
        <span className="text-ink-faint">● your natal</span>
        <span style={{ color: '#8b3a3a' }}>| natal sun</span>
      </div>
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

function isHittingNatal(
  transitLon: number,
  natalPlanets: { name: PlanetName; lon: number }[],
  orbDeg = 3,
): boolean {
  for (const np of natalPlanets) {
    let d = Math.abs(transitLon - np.lon) % 360;
    if (d > 180) d = 360 - d;
    if (d <= orbDeg) return true;
  }
  return false;
}
