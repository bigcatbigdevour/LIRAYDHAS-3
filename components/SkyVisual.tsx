'use client';

import { useMemo } from 'react';
import type { Blueprint, PlanetName } from '@/lib/types';
import { todaysTransits, currentRetrogrades } from '@/lib/astrology/transits';
import { houseOfLongitude } from '@/lib/astrology/houses';
import SignGlyph, { signGlyphPaths } from './SignGlyph';
import PlanetGlyph, { planetGlyphPaths } from './PlanetGlyph';

const SIGN_ORDER = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

/** Inline SVG glyph at (x,y) for use inside another <svg>. */
function GlyphAt({
  paths, x, y, size, stroke, strokeWidth = 1.2,
}: {
  paths: React.ReactNode;
  x: number;
  y: number;
  size: number;
  stroke: string;
  strokeWidth?: number;
}) {
  if (!paths) return null;
  const s = size / 24;
  return (
    <g
      transform={`translate(${x - size / 2} ${y - size / 2}) scale(${s})`}
      stroke={stroke}
      strokeWidth={strokeWidth / s}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths}
    </g>
  );
}

const ORDER: PlanetName[] = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
];

export default function SkyVisual({ blueprint }: { blueprint: Blueprint }) {
  const { transits, retros } = useMemo(() => {
    const t = todaysTransits(blueprint.natal);
    const r = new Set(currentRetrogrades());
    return { transits: t, retros: r };
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
        {/* tiny scattered background stars — atmospheric, not informational */}
        {(() => {
          // Deterministic pseudo-random points so they don't reflow per render.
          const stars: { x: number; y: number; r: number; dur: number; delay: number }[] = [];
          let seed = 1234;
          function rand() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
          }
          for (let i = 0; i < 60; i++) {
            // place inside the bounding square but outside the planet ring
            const angle = rand() * Math.PI * 2;
            const r = outer + 6 + rand() * (size / 2 - outer - 10);
            const x = cx + r * Math.cos(angle);
            const y = cy + r * Math.sin(angle);
            if (x < 4 || x > size - 4 || y < 4 || y > size - 4) continue;
            stars.push({ x, y, r: 0.4 + rand() * 0.7, dur: 4 + rand() * 4, delay: rand() * 4 });
          }
          return stars.map((s, i) => (
            <circle key={`star-${i}`} cx={s.x} cy={s.y} r={s.r} fill="#888" opacity={0.35}>
              <animate
                attributeName="opacity"
                values="0.15;0.45;0.15"
                dur={`${s.dur}s`}
                begin={`${s.delay}s`}
                repeatCount="indefinite"
              />
            </circle>
          ));
        })()}
        {/* outer ring with very slow rotation — the sky is moving */}
        <g style={{ transformOrigin: `${cx}px ${cy}px` }}>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={`0 ${cx} ${cy}`}
            to={`360 ${cx} ${cy}`}
            dur="600s"
            repeatCount="indefinite"
          />
          <circle cx={cx} cy={cy} r={outer + 2} fill="none" stroke="#1a1a1a" strokeWidth="0.3" strokeDasharray="3 6" />
        </g>
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
        {/* sign glyphs at midpoints — SVG paths, not Unicode (iOS would
            render the chars as full-color emoji). */}
        {SIGN_ORDER.map((sign, i) => {
          const mid = point(i * 30 + 15, (outer + ring) / 2);
          return (
            <GlyphAt
              key={sign}
              paths={signGlyphPaths(sign)}
              x={mid.x}
              y={mid.y}
              size={12}
              stroke="#777"
              strokeWidth={1}
            />
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
        {/* natal sun marker on outer ring — slow opacity pulse */}
        {(() => {
          const a = point(n.sun.longitude, ring);
          const b = point(n.sun.longitude, outer);
          return (
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="#8b3a3a" strokeWidth="1.6">
              <animate
                attributeName="opacity"
                values="1;0.55;1"
                dur="4.5s"
                repeatCount="indefinite"
              />
            </line>
          );
        })()}
        {/* faint natal planet ghosts on inner dashed ring */}
        {natalPlaced.map((p) => {
          const pos = point(p.adjustedLon, natalR);
          return (
            <GlyphAt
              key={`nat-${p.name}`}
              paths={planetGlyphPaths(p.name)}
              x={pos.x}
              y={pos.y}
              size={11}
              stroke="#666"
              strokeWidth={1}
            />
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
              <GlyphAt
                paths={planetGlyphPaths(p.name)}
                x={pos.x}
                y={pos.y}
                size={15}
                stroke="#f4f1ea"
                strokeWidth={1.2}
              />
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

      <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-1 text-[11.5px]">
        {ORDER.map((p) => {
          const lon = transits.positions[p];
          if (lon === undefined || lon < 0) return null;
          const signIdx = Math.floor(lon / 30);
          const deg = lon % 30;
          const house = houseOfLongitude(lon, blueprint.natal.houses);
          const isRetro = retros.has(p);
          return (
            <li key={p} className="flex justify-between border-b border-hairline py-0.5">
              <span className="text-ink-dim flex items-center gap-1.5">
                <PlanetGlyph name={p} size={12} className="text-ink shrink-0" />
                {p}
                {isRetro && <span className="text-accent ml-1">℞</span>}
              </span>
              <span className="tabular-nums text-ink-dim flex items-center gap-1">
                <SignGlyph sign={SIGN_ORDER[signIdx]} size={11} className="text-ink-dim" />
                <span>{deg.toFixed(1)}°</span>
                {house ? <span className="text-ink-faint"> · H{house}</span> : null}
              </span>
            </li>
          );
        })}
      </ul>
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
