'use client';

import { useMemo, useState } from 'react';
import type { Blueprint, PlanetName } from '@/lib/types';
import { todaysTransits } from '@/lib/astrology/transits';

const SIGNS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const GLYPH: Partial<Record<PlanetName, string>> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  NorthNode: '☊', Chiron: '⚷',
};

interface Body { name: PlanetName; lon: number }

export default function NatalWheel({ blueprint }: { blueprint: Blueprint }) {
  const [showTransits, setShowTransits] = useState(false);
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

  const transits = useMemo(() => {
    const t = todaysTransits(blueprint.natal);
    const TRANSIT_ORDER: PlanetName[] = [
      'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
      'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
    ];
    return TRANSIT_ORDER
      .map((p) => ({ name: p, lon: t.positions[p] }))
      .filter((p): p is { name: PlanetName; lon: number } => p.lon !== undefined && p.lon >= 0);
  }, [blueprint]);

  const size = 340;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = 158;
  const rRing = 138;
  const rPlanet = 112;
  const rTransit = 92;
  const rInner = 64;

  const housesKnown = n.houses.every((h) => h != null);
  const ascOffset = n.asc ?? 0;

  function point(lon: number, r: number) {
    const rel = ((lon - ascOffset) + 360) % 360;
    const theta = ((180 - rel) * Math.PI) / 180;
    return { x: cx + r * Math.cos(theta), y: cy - r * Math.sin(theta) };
  }

  const placed = layout(bodies, 6);
  const transitPlaced = layout(transits, 7);

  return (
    <>
    <div className="flex justify-end mb-1">
      <button
        type="button"
        onClick={() => setShowTransits(!showTransits)}
        className="small-label caps text-[10px] text-ink-faint hover:text-ink py-1 px-1"
        aria-pressed={showTransits}
        aria-label={showTransits ? 'hide transit overlay' : 'show transit overlay'}
      >
        {showTransits ? '✓ transits' : 'show transits'}
      </button>
    </div>
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[380px] mx-auto block">
      <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke="#222" strokeWidth="0.6" />
      <circle cx={cx} cy={cy} r={rRing}  fill="none" stroke="#222" strokeWidth="0.4" />
      <circle cx={cx} cy={cy} r={rInner} fill="none" stroke="#222" strokeWidth="0.4" />
      {showTransits && (
        <circle cx={cx} cy={cy} r={rTransit} fill="none" stroke="#222" strokeWidth="0.3" strokeDasharray="2 3" />
      )}

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
          <text key={i} x={mid.x} y={mid.y + 3} textAnchor="middle" fontSize="10" fill="#777" fontFamily="serif">{g}</text>
        );
      })}

      {/* house cusps + numbers */}
      {housesKnown && (n.houses as number[]).map((cusp, i) => {
        const a = point(cusp, rInner);
        const b = point(cusp, rRing);
        const isAngle = i === 0 || i === 3 || i === 6 || i === 9;
        const nextCusp = (n.houses as number[])[(i + 1) % 12];
        // mid-house for number
        let arc = (nextCusp - cusp + 360) % 360;
        const houseMid = (cusp + arc / 2) % 360;
        const numPos = point(houseMid, rInner + 12);
        return (
          <g key={`h${i}`}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={isAngle ? '#666' : '#222'}
                  strokeWidth={isAngle ? 0.9 : 0.4} />
            <text x={numPos.x} y={numPos.y + 3} textAnchor="middle" fontSize="8" fill="#555">
              {i + 1}
            </text>
          </g>
        );
      })}

      {/* aspect lines */}
      {aspectLines(bodies).map((seg, i) => {
        const a = point(seg.aLon, rInner - 4);
        const b = point(seg.bLon, rInner - 4);
        return (
          <line key={`a${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={seg.color} strokeWidth="0.4" opacity="0.75" />
        );
      })}

      {/* planets */}
      {placed.map((p) => {
        const pos = point(p.adjustedLon, rPlanet);
        return (
          <g key={p.name}>
            <line
              x1={point(p.lon, rRing - 4).x} y1={point(p.lon, rRing - 4).y}
              x2={point(p.lon, rRing - 12).x} y2={point(p.lon, rRing - 12).y}
              stroke="#3a3a3a" strokeWidth="0.5" />
            <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="13" fill="#f4f1ea">
              {GLYPH[p.name] ?? '·'}
            </text>
          </g>
        );
      })}

      {/* angles: ASC, IC, DSC, MC */}
      {n.asc !== null && (
        <text x={point(n.asc, rOuter + 12).x} y={point(n.asc, rOuter + 12).y + 3}
              textAnchor="middle" fontSize="9" fill="#8b3a3a">ASC</text>
      )}
      {n.mc !== null && (
        <text x={point(n.mc, rOuter + 12).x} y={point(n.mc, rOuter + 12).y + 3}
              textAnchor="middle" fontSize="9" fill="#8b3a3a">MC</text>
      )}
      {n.asc !== null && (
        <text x={point((n.asc + 180) % 360, rOuter + 12).x} y={point((n.asc + 180) % 360, rOuter + 12).y + 3}
              textAnchor="middle" fontSize="9" fill="#555">DSC</text>
      )}
      {n.mc !== null && (
        <text x={point((n.mc + 180) % 360, rOuter + 12).x} y={point((n.mc + 180) % 360, rOuter + 12).y + 3}
              textAnchor="middle" fontSize="9" fill="#555">IC</text>
      )}

      {/* TRANSIT overlay — only the 6 tightest aspects, coloured by type. */}
      {showTransits && (() => {
        const ASPECTS = [
          { angle: 0,   orb: 5, color: '#f4f1ea' },  // conjunction — cream
          { angle: 60,  orb: 4, color: '#3a7a52' },  // sextile — green
          { angle: 90,  orb: 5, color: '#8b3a3a' },  // square — wine
          { angle: 120, orb: 5, color: '#3a7a52' },  // trine — green
          { angle: 180, orb: 5, color: '#8b3a3a' },  // opposition — wine
        ];
        const aspects: { a: number; b: number; tightness: number; color: string }[] = [];
        for (const tr of transits) {
          for (const nat of bodies) {
            let d = Math.abs(tr.lon - nat.lon) % 360;
            if (d > 180) d = 360 - d;
            for (const A of ASPECTS) {
              const orb = Math.abs(d - A.angle);
              if (orb <= A.orb) {
                aspects.push({ a: tr.lon, b: nat.lon, tightness: orb, color: A.color });
                break;
              }
            }
          }
        }
        return aspects
          .sort((p, q) => p.tightness - q.tightness)
          .slice(0, 6)
          .map((seg, i) => {
            const a = point(seg.a, rTransit);
            const b = point(seg.b, rPlanet);
            return (
              <line
                key={`aspect-${i}`}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={seg.color} strokeWidth="0.5" opacity={Math.max(0.25, 0.75 - seg.tightness * 0.09)}
                strokeDasharray="2 2"
              />
            );
          });
      })()}
      {showTransits && transitPlaced.map((t) => {
        const pos = point(t.adjustedLon, rTransit);
        return (
          <g key={`t-${t.name}`}>
            <line
              x1={point(t.lon, rInner + 4).x} y1={point(t.lon, rInner + 4).y}
              x2={point(t.lon, rInner + 12).x} y2={point(t.lon, rInner + 12).y}
              stroke="#8b3a3a" strokeWidth="0.5" opacity="0.7"
            />
            <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="11" fill="#b22a2a">
              {GLYPH[t.name] ?? '·'}
            </text>
          </g>
        );
      })}
    </svg>
    {showTransits && (
      <p className="text-center small-label caps text-ink-faint mt-1" style={{ letterSpacing: '0.18em' }}>
        cream = natal · wine = today
      </p>
    )}
    </>
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
