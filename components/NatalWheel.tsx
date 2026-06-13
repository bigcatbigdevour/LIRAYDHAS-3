'use client';

import { useMemo, useState } from 'react';
import type { Blueprint, PlanetName, ZodiacSign } from '@/lib/types';
import { todaysTransits } from '@/lib/astrology/transits';
import { signGlyphPaths } from './SignGlyph';
import PlanetGlyph, { planetGlyphPaths } from './PlanetGlyph';
import SignGlyph from './SignGlyph';
import { PLANET_MEANINGS } from '@/lib/astrology/planetMeanings';
import { HOUSE_MEANINGS } from '@/lib/astrology/houseMeanings';
import { houseOfLongitude } from '@/lib/astrology/houses';
import { tap as hapticTap } from '@/lib/haptics';

const SIGN_ORDER = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

/**
 * Inline an SVG glyph (path data from a 24×24 viewBox) at (x,y) with the
 * given pixel size. translate to (x - size/2, y - size/2) then scale so
 * the 24-unit grid fits the desired pixel size.
 */
function GlyphAt({
  paths,
  x,
  y,
  size,
  stroke,
  strokeWidth = 1.2,
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

interface Body { name: PlanetName; lon: number }

export default function NatalWheel({ blueprint }: { blueprint: Blueprint }) {
  const [showTransits, setShowTransits] = useState(false);
  const [selected, setSelected] = useState<PlanetName | null>(null);
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

      {/* sign glyphs — SVG icons, not Unicode (iOS renders the chars
          as full-color emoji). */}
      {SIGN_ORDER.map((sign, i) => {
        const mid = point(i * 30 + 15, (rOuter + rRing) / 2);
        return (
          <GlyphAt
            key={sign}
            paths={signGlyphPaths(sign)}
            x={mid.x}
            y={mid.y}
            size={14}
            stroke="#888"
            strokeWidth={1.1}
          />
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

      {/* planets — each is tappable; selected gets an accent ring */}
      {placed.map((p) => {
        const pos = point(p.adjustedLon, rPlanet);
        const isSelected = selected === p.name;
        return (
          <g
            key={p.name}
            onClick={() => {
              hapticTap('light');
              setSelected(isSelected ? null : p.name);
            }}
            style={{ cursor: 'pointer' }}
            role="button"
            aria-label={`${p.name} — tap to learn what it does`}
          >
            <line
              x1={point(p.lon, rRing - 4).x} y1={point(p.lon, rRing - 4).y}
              x2={point(p.lon, rRing - 12).x} y2={point(p.lon, rRing - 12).y}
              stroke="#3a3a3a" strokeWidth="0.5" />
            {/* large invisible hit target so finger-sized taps land cleanly */}
            <circle cx={pos.x} cy={pos.y} r={11} fill="transparent" />
            {isSelected && (
              <circle cx={pos.x} cy={pos.y} r={11} fill="none"
                stroke="#b22a2a" strokeWidth={1} opacity={0.85} />
            )}
            <GlyphAt
              paths={planetGlyphPaths(p.name)}
              x={pos.x}
              y={pos.y}
              size={16}
              stroke={isSelected ? '#b22a2a' : '#f4f1ea'}
              strokeWidth={1.2}
            />
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
            <GlyphAt
              paths={planetGlyphPaths(t.name)}
              x={pos.x}
              y={pos.y}
              size={13}
              stroke="#b22a2a"
              strokeWidth={1.1}
            />
          </g>
        );
      })}
    </svg>
    {showTransits && (
      <p className="text-center small-label caps text-ink-faint mt-1" style={{ letterSpacing: '0.18em' }}>
        cream = natal · wine = today
      </p>
    )}
    {selected && (() => {
      const meaning = PLANET_MEANINGS[selected];
      // Look up the natal sign + degree for this planet.
      const planetData: Record<string, { sign: ZodiacSign; degree: number; longitude: number } | null> = {
        Sun: n.sun, Moon: n.moon, Mercury: n.mercury, Venus: n.venus,
        Mars: n.mars, Jupiter: n.jupiter, Saturn: n.saturn,
        Uranus: n.uranus, Neptune: n.neptune, Pluto: n.pluto,
        NorthNode: n.northNode, Chiron: n.chiron,
      };
      const data = planetData[selected];
      // Houses depend on birth time; for time-unknown charts the cusps
      // are null and we can't say which house the planet sits in.
      const houseNum = data && n.houses[0] !== null
        ? houseOfLongitude(data.longitude, n.houses)
        : null;
      const houseInfo = houseNum ? HOUSE_MEANINGS[houseNum] : null;
      return (
        <section className="mt-3 border border-hairline p-3 fade-in" aria-live="polite">
          <header className="flex items-baseline justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <PlanetGlyph name={selected} size={16} className="text-ink" />
              <p className="serif text-[15px] text-ink">{selected}</p>
              {data && (
                <span className="flex items-center gap-1 small-label caps text-ink-faint text-[10px]" style={{ letterSpacing: '0.14em' }}>
                  in
                  <SignGlyph sign={data.sign} size={11} className="text-ink-dim" />
                  <span>{data.degree.toFixed(1)}°</span>
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => { hapticTap('light'); setSelected(null); }}
              className="small-label caps text-ink-faint hover:text-ink text-[10px]"
              style={{ letterSpacing: '0.18em' }}
              aria-label="close planet info"
            >
              × close
            </button>
          </header>
          {meaning && (
            <>
              <p
                className="small-label caps text-accent text-[10px] mb-1.5"
                style={{ letterSpacing: '0.18em' }}
              >
                {meaning.role}
              </p>
              <p className="serif text-[13.5px] text-ink-dim leading-relaxed">
                {meaning.showsUp}
              </p>
            </>
          )}
          {houseInfo && houseNum && (
            <div className="mt-3 pt-3 border-t border-hairline">
              <p
                className="small-label caps text-ink-faint text-[10px] mb-1"
                style={{ letterSpacing: '0.16em' }}
              >
                in your {houseNum}{ordinalSuffix(houseNum)} house · {houseInfo.name.toLowerCase()}
              </p>
              <p className="serif text-[12.5px] text-ink-dim leading-relaxed">
                {houseInfo.meaning}
              </p>
            </div>
          )}
          {data && n.houses[0] === null && (
            <p className="text-[11px] text-ink-faint italic mt-3 pt-3 border-t border-hairline">
              your birth time wasn't recorded, so the house this lands in is unknown.
            </p>
          )}
        </section>
      );
    })()}
    </>
  );
}

function ordinalSuffix(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
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
