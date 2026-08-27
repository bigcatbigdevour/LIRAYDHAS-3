'use client';

import { useState } from 'react';
import type { Blueprint, CenterName } from '@/lib/types';
import { ALL_CHANNELS } from '@/lib/humandesign/channels';
import { CENTER_MEANINGS } from '@/lib/humandesign/centerMeanings';
import { channelMeaning } from '@/lib/humandesign/channelMeanings';
import { gateName } from '@/lib/humandesign/gateNames';
import { centerOfGate, centerLabel } from '@/lib/humandesign/centers';
import { tap as hapticTap } from '@/lib/haptics';

// Canonical vertical bodygraph layout, 320 × 580 viewBox.

const W = 320;
const H = 580;

interface CenterDef {
  cx: number; cy: number;
  shape: 'triangle-up' | 'triangle-down' | 'square' | 'diamond';
  size: number;
  /** Canonical HD color (filled when defined). */
  fill: string;
}

// Canonical body-chart center colors — toned down to suit the dark
// background, while remaining recognisable to anyone who reads charts
// elsewhere.
const CENTERS: Record<CenterName, CenterDef> = {
  Head:        { cx: 160, cy: 55,  shape: 'triangle-up',   size: 38, fill: '#c49a3b' },  // gold
  Ajna:        { cx: 160, cy: 130, shape: 'triangle-down', size: 38, fill: '#5a7a4a' },  // green
  Throat:      { cx: 160, cy: 210, shape: 'square',        size: 40, fill: '#8b7355' },  // brown
  G:           { cx: 160, cy: 310, shape: 'diamond',       size: 46, fill: '#c49a3b' },  // gold
  Heart:       { cx: 230, cy: 305, shape: 'triangle-up',   size: 30, fill: '#a93232' },  // red
  Sacral:      { cx: 160, cy: 410, shape: 'square',        size: 42, fill: '#a93232' },  // red
  SolarPlexus: { cx: 268, cy: 410, shape: 'triangle-down', size: 36, fill: '#a65a52' },  // mauve/rust
  Spleen:      { cx: 52,  cy: 410, shape: 'triangle-down', size: 36, fill: '#8b7355' },  // brown
  Root:        { cx: 160, cy: 510, shape: 'square',        size: 42, fill: '#8b7355' },  // brown
};

const GATE_ANCHORS: Record<number, { x: number; y: number }> = {
  // === HEAD ===
  // Pulled up to sit at the bottom edge of the head triangle
  // (cy=55, size=38, bottom edge y ≈ 75.9). Gate dots straddle the
  // edge — half inside the triangle, half outside — so the channel
  // line down to Ajna visually originates from the head itself, not
  // from a floating dot in the gap.
  64: { x: 142, y: 76 },
  61: { x: 160, y: 76 },
  63: { x: 178, y: 76 },

  // === AJNA ===
  // Top gates pulled down to sit at the top edge of the Ajna
  // triangle (cy=130, size=38, top edge y ≈ 109.1). Symmetric with
  // the head fix above; the channel from head bottom to Ajna top
  // now spans the full gap between centres without dot-floating.
  47: { x: 142, y: 109 },
  24: { x: 160, y: 109 },
  4:  { x: 178, y: 109 },
  17: { x: 145, y: 156 },
  43: { x: 160, y: 162 },
  11: { x: 175, y: 156 },

  // === THROAT ===
  62: { x: 145, y: 174 },
  23: { x: 160, y: 174 },
  56: { x: 175, y: 174 },
  35: { x: 198, y: 196 },
  12: { x: 198, y: 220 },
  31: { x: 138, y: 246 },
  8:  { x: 154, y: 246 },
  33: { x: 170, y: 246 },
  45: { x: 188, y: 246 },
  20: { x: 122, y: 220 },
  16: { x: 122, y: 196 },

  // === G CENTER ===
  7:  { x: 160, y: 270 },
  1:  { x: 148, y: 281 },
  13: { x: 172, y: 281 },
  10: { x: 122, y: 310 },
  25: { x: 198, y: 310 },
  15: { x: 136, y: 333 },
  2:  { x: 184, y: 333 },
  46: { x: 160, y: 350 },

  // === HEART ===
  21: { x: 230, y: 286 },
  51: { x: 214, y: 314 },
  26: { x: 224, y: 326 },
  40: { x: 244, y: 326 },

  // === SACRAL ===
  34: { x: 124, y: 372 },
  5:  { x: 144, y: 372 },
  14: { x: 160, y: 372 },
  29: { x: 176, y: 372 },
  59: { x: 200, y: 400 },
  27: { x: 120, y: 400 },
  3:  { x: 145, y: 448 },
  9:  { x: 165, y: 448 },
  42: { x: 180, y: 448 },

  // === SOLAR PLEXUS ===
  22: { x: 290, y: 388 },
  36: { x: 254, y: 388 },
  6:  { x: 246, y: 405 },
  37: { x: 254, y: 418 },
  49: { x: 250, y: 425 },
  55: { x: 268, y: 440 },
  30: { x: 286, y: 425 },

  // === SPLEEN ===
  48: { x: 70,  y: 388 },
  57: { x: 84,  y: 392 },
  44: { x: 84,  y: 408 },
  50: { x: 84,  y: 420 },
  32: { x: 66,  y: 432 },
  28: { x: 50,  y: 440 },
  18: { x: 32,  y: 432 },

  // === ROOT ===
  53: { x: 180, y: 472 },
  60: { x: 160, y: 472 },
  52: { x: 140, y: 472 },
  41: { x: 200, y: 478 },
  39: { x: 200, y: 496 },
  19: { x: 200, y: 514 },
  58: { x: 120, y: 478 },
  38: { x: 120, y: 496 },
  54: { x: 120, y: 514 },
};

function shapePath(name: CenterName): string {
  const c = CENTERS[name];
  const { cx, cy, size, shape } = c;
  switch (shape) {
    case 'triangle-up':
      return `M ${cx} ${cy - size} L ${cx + size} ${cy + size * 0.55} L ${cx - size} ${cy + size * 0.55} Z`;
    case 'triangle-down':
      return `M ${cx - size} ${cy - size * 0.55} L ${cx + size} ${cy - size * 0.55} L ${cx} ${cy + size} Z`;
    case 'square':
      return `M ${cx - size} ${cy - size} L ${cx + size} ${cy - size} L ${cx + size} ${cy + size} L ${cx - size} ${cy + size} Z`;
    case 'diamond':
      return `M ${cx} ${cy - size} L ${cx + size} ${cy} L ${cx} ${cy + size} L ${cx - size} ${cy} Z`;
  }
}

/** Lighten a hex color toward white by `pct` (0–1). */
function lighten(hex: string, pct: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lr = Math.round(r + (255 - r) * pct);
  const lg = Math.round(g + (255 - g) * pct);
  const lb = Math.round(b + (255 - b) * pct);
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
}
/** Darken a hex color toward black by `pct` (0–1). */
function darken(hex: string, pct: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const dr = Math.round(r * (1 - pct));
  const dg = Math.round(g * (1 - pct));
  const db = Math.round(b * (1 - pct));
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
}

interface TappedChannel { a: number; b: number; name: string }

export default function BodyGraph({ blueprint }: { blueprint: Blueprint }) {
  const [tappedCenter, setTappedCenter] = useState<CenterName | null>(null);
  const [tappedChannel, setTappedChannel] = useState<TappedChannel | null>(null);
  const [tappedGate, setTappedGate] = useState<number | null>(null);
  const defined = new Set(blueprint.humanDesign.definedCenters);
  const activeGates = new Set(blueprint.humanDesign.activeGates.map((g) => g.gate));
  const persGates = new Set(
    blueprint.humanDesign.activeGates.filter((g) => g.chart === 'personality').map((g) => g.gate),
  );
  const desGates = new Set(
    blueprint.humanDesign.activeGates.filter((g) => g.chart === 'design').map((g) => g.gate),
  );
  const activeChannelKeys = new Set(
    blueprint.humanDesign.activeChannels.map((p) => [...p].sort((a, b) => a - b).join('-')),
  );

  // Color of a gate node (cream personality / wine design / split / dim).
  const gateColor = (g: number) =>
    persGates.has(g) && desGates.has(g)
      ? 'split'
      : persGates.has(g)
        ? '#f4f1ea'
        : desGates.has(g)
          ? '#b22a2a'
          : '#2a2a2a';

  return (
    <>
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[340px] mx-auto block">
      <defs>
        {/* Soft drop shadow for centers — gives the shapes depth. */}
        <filter id="bg-center-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.4" />
          <feOffset dx="0" dy="1.5" result="off" />
          <feComponentTransfer><feFuncA type="linear" slope="0.55" /></feComponentTransfer>
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {/* Outer glow for active channels. */}
        <filter id="bg-channel-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {/* Tiny shadow under gate nodes. */}
        <filter id="bg-node-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="0.6" />
          <feOffset dx="0" dy="0.6" result="off" />
          <feComponentTransfer><feFuncA type="linear" slope="0.85" /></feComponentTransfer>
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>

        {/* Body silhouette gradient — radial so the body has a soft "core
            glow" in the chest area, fading to background near the edges.
            Reads as 3D rather than a flat cutout. */}
        <radialGradient id="bg-silhouette" cx="50%" cy="42%" r="58%">
          <stop offset="0%"  stopColor="#1f1f1f" />
          <stop offset="55%" stopColor="#141414" />
          <stop offset="100%" stopColor="#0b0b0b" />
        </radialGradient>

        {/* Per-center radial gradient (highlight upper-left) for defined fills. */}
        {(Object.keys(CENTERS) as CenterName[]).map((name) => {
          const c = CENTERS[name];
          return (
            <radialGradient
              key={`grad-${name}`}
              id={`bg-grad-${name}`}
              cx="35%" cy="30%" r="75%"
            >
              <stop offset="0%" stopColor={lighten(c.fill, 0.22)} />
              <stop offset="60%" stopColor={c.fill} />
              <stop offset="100%" stopColor={darken(c.fill, 0.25)} />
            </radialGradient>
          );
        })}

        {/* Per-active-channel gradient: from gate-a's source-color to gate-b's source-color. */}
        {ALL_CHANNELS.map((ch) => {
          const [a, b] = ch.gates;
          const A = GATE_ANCHORS[a];
          const B = GATE_ANCHORS[b];
          if (!A || !B) return null;
          const key = [a, b].sort((x, y) => x - y).join('-');
          if (!activeChannelKeys.has(key)) return null;
          const colorAt = (g: number) => {
            const c = gateColor(g);
            if (c === 'split') return '#d9a09a';
            return c;
          };
          return (
            <linearGradient
              key={`chgrad-${key}`}
              id={`bg-ch-${key}`}
              gradientUnits="userSpaceOnUse"
              x1={A.x} y1={A.y} x2={B.x} y2={B.y}
            >
              <stop offset="0%" stopColor={colorAt(a)} />
              <stop offset="100%" stopColor={colorAt(b)} />
            </linearGradient>
          );
        })}
      </defs>

      {/* === BODY SILHOUETTE (behind everything) ===
          An anatomically-shaped human form: egg-shaped head with a chin
          taper, defined neck, trapezius slope to shoulders, ribcage that
          narrows, waist indent, hip flare, then tapered legs with ankles.
          Wide enough at the torso to fully envelop the Spleen (x=52) and
          Solar Plexus (x=268) extensions. Subtle inner anatomical hints
          (collarbone, sternum, pelvic line) layered on top at very low
          opacity so they don't compete with the centers / channels. */}
      <g pointerEvents="none">
        <path
          d="
            M 160 14
            C 195 14 215 36 215 78
            C 215 108 205 130 188 148
            C 184 158 184 168 187 175
            C 215 184 252 198 280 226
            C 296 246 298 274 296 300
            C 294 326 292 360 290 396
            C 288 426 285 450 282 476
            C 282 500 286 522 282 546
            C 277 566 265 580 252 580
            L 215 580
            C 215 555 205 525 195 495
            C 188 470 175 460 165 460
            L 155 460
            C 145 460 132 470 125 495
            C 115 525 105 555 105 580
            L 68 580
            C 55 580 43 566 38 546
            C 34 522 38 500 38 476
            C 35 450 32 426 30 396
            C 28 360 26 326 24 300
            C 22 274 24 246 40 226
            C 68 198 105 184 133 175
            C 136 168 136 158 132 148
            C 115 130 105 108 105 78
            C 105 36 125 14 160 14 Z
          "
          fill="url(#bg-silhouette)"
          stroke="#272727"
          strokeWidth={0.9}
          strokeLinejoin="round"
        />
        {/* Subtle anatomical accent strokes — clavicle curve at the
            shoulders, sternum line down the center of the chest, pelvic
            line above the legs. All extremely faint so they read as
            shading, not as foreground. */}
        <path
          d="M 137 178 Q 160 188 183 178"
          fill="none" stroke="#262626" strokeWidth={0.6} opacity={0.65}
        />
        <path
          d="M 160 200 L 160 268"
          stroke="#202020" strokeWidth={0.5} opacity={0.55}
        />
        <path
          d="M 122 460 Q 160 472 198 460"
          fill="none" stroke="#262626" strokeWidth={0.55} opacity={0.6}
        />
      </g>

      {/* === CENTER SHAPES (under channels and nodes) === */}
      {(Object.keys(CENTERS) as CenterName[]).map((name) => {
        const c = CENTERS[name];
        const isDefined = defined.has(name);
        const isTapped = tappedCenter === name;
        return (
          <g key={`center-${name}`}>
            {/* glow ring when tapped */}
            {isTapped && (
              <path
                d={shapePath(name)}
                fill="none"
                stroke="#f4f1ea"
                strokeWidth={2.2}
                opacity={0.35}
                filter="url(#bg-channel-glow)"
                pointerEvents="none"
              />
            )}
            <path
              d={shapePath(name)}
              fill={isDefined ? `url(#bg-grad-${name})` : '#0e0e0e'}
              fillOpacity={isDefined ? 1 : 0.85}
              stroke={isTapped ? '#f4f1ea' : isDefined ? darken(c.fill, 0.45) : '#2a2a2a'}
              strokeWidth={isTapped ? 1.4 : isDefined ? 0.8 : 0.9}
              filter={isDefined ? 'url(#bg-center-shadow)' : undefined}
              style={{ cursor: 'pointer' }}
              onClick={() => {
                hapticTap('light');
                setTappedCenter(isTapped ? null : name);
                setTappedChannel(null);
                setTappedGate(null);
              }}
            />
          </g>
        );
      })}

      {/* === CHANNELS (between centers, under gate nodes) === */}
      {ALL_CHANNELS.map((ch) => {
        const [a, b] = ch.gates;
        const key = [a, b].sort((x, y) => x - y).join('-');
        const isActive = activeChannelKeys.has(key);
        const A = GATE_ANCHORS[a];
        const B = GATE_ANCHORS[b];
        if (!A || !B) return null;
        const aActive = activeGates.has(a);
        const bActive = activeGates.has(b);
        const mid = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
        const isTapped = !!tappedChannel && tappedChannel.a === a && tappedChannel.b === b;
        const halfStroke = (isHalfActive: boolean) => {
          if (isTapped) return '#d44343';
          if (isHalfActive) return '#a8a8a8';
          // Third bump (user report: still invisible on a real iPhone
          // panel at typical brightness). #4a4a4a is ~29% grey — far
          // enough from the #0a0a0a background to survive OLED black
          // crush + antialiasing at thin widths, while staying clearly
          // quieter than the half-active (#a8a8a8) and active states.
          return '#4a4a4a';
        };
        const halfWidth = (isHalfActive: boolean) => {
          if (isTapped) return 2.4;
          if (isHalfActive) return 1.6;
          return 1.2;
        };
        return (
          <g
            key={`ch-${key}`}
            style={{ cursor: isActive ? 'pointer' : 'default' }}
            onClick={isActive ? () => {
              hapticTap('light');
              setTappedChannel(isTapped ? null : { a, b, name: ch.name });
              setTappedCenter(null);
              setTappedGate(null);
            } : undefined}
          >
            {isActive ? (
              <>
                {/* soft glow behind a defined channel */}
                <line
                  x1={A.x} y1={A.y} x2={B.x} y2={B.y}
                  stroke={isTapped ? '#8b3a3a' : '#f4f1ea'}
                  strokeWidth={isTapped ? 6 : 5}
                  opacity={isTapped ? 0.22 : 0.10}
                  pointerEvents="none"
                  filter="url(#bg-channel-glow)"
                />
                {/* the active channel itself — a gradient from A's color to B's color */}
                <line
                  x1={A.x} y1={A.y} x2={B.x} y2={B.y}
                  stroke={isTapped ? '#d44343' : `url(#bg-ch-${key})`}
                  strokeWidth={isTapped ? 2.4 : 2.0}
                  strokeLinecap="round"
                />
              </>
            ) : (
              <>
                <line
                  x1={A.x} y1={A.y} x2={mid.x} y2={mid.y}
                  stroke={halfStroke(aActive)}
                  strokeWidth={halfWidth(aActive)}
                  strokeLinecap="round"
                />
                <line
                  x1={mid.x} y1={mid.y} x2={B.x} y2={B.y}
                  stroke={halfStroke(bActive)}
                  strokeWidth={halfWidth(bActive)}
                  strokeLinecap="round"
                />
              </>
            )}
            {isActive && (
              <line
                x1={A.x} y1={A.y} x2={B.x} y2={B.y}
                stroke="transparent" strokeWidth="16" pointerEvents="stroke"
              />
            )}
          </g>
        );
      })}

      {/* === GATE NODES (small jewels on each center's perimeter) === */}
      {Object.entries(GATE_ANCHORS).map(([gateStr, p]) => {
        const gate = Number(gateStr);
        const isP = persGates.has(gate);
        const isD = desGates.has(gate);
        const isBoth = isP && isD;
        const lit = isP || isD;
        const isInTappedChannel = !!tappedChannel && (tappedChannel.a === gate || tappedChannel.b === gate);
        const isTappedGate = tappedGate === gate;
        const highlight = isInTappedChannel || isTappedGate;
        const radius = highlight ? 6.5 : lit ? 5.5 : 5;
        // Unlit ring bumped #2a2a2a → #4f4f4f + width 0.5 → 0.9 (same
        // visibility pass as the channel lines — the old values were
        // getting crushed to invisible on OLED iPhone panels).
        const ringStroke = highlight ? '#d44343' : lit ? '#0a0a0a' : '#4f4f4f';
        const ringWidth = highlight ? 1.3 : lit ? 0.7 : 0.9;
        return (
          <g key={`node-${gate}`} pointerEvents="none" filter={lit ? 'url(#bg-node-shadow)' : undefined}>
            {isBoth ? (
              <>
                <path
                  d={`M ${p.x} ${p.y - radius} A ${radius} ${radius} 0 0 0 ${p.x} ${p.y + radius} Z`}
                  fill="#b22a2a"
                />
                <path
                  d={`M ${p.x} ${p.y - radius} A ${radius} ${radius} 0 0 1 ${p.x} ${p.y + radius} Z`}
                  fill="#f4f1ea"
                />
                <circle cx={p.x} cy={p.y} r={radius} fill="none" stroke={ringStroke} strokeWidth={ringWidth} />
              </>
            ) : (
              <circle
                cx={p.x} cy={p.y} r={radius}
                fill={isP ? '#f4f1ea' : isD ? '#b22a2a' : '#161616'}
                stroke={ringStroke}
                strokeWidth={ringWidth}
              />
            )}
          </g>
        );
      })}

      {/* === GATE NUMBERS (overlay) === */}
      {Object.entries(GATE_ANCHORS).map(([gateStr, p]) => {
        const gate = Number(gateStr);
        const isP = persGates.has(gate);
        const isD = desGates.has(gate);
        const isBoth = isP && isD;
        const fill = isBoth ? '#0a0a0a' : isP ? '#0a0a0a' : isD ? '#f4f1ea' : '#666';
        return (
          <text
            key={`label-${gate}`}
            x={p.x}
            y={p.y + 2.5}
            textAnchor="middle"
            fontSize="7"
            fontWeight={isP || isD ? '600' : '500'}
            fill={fill}
            fontFamily="var(--font-sans), Inter, sans-serif"
            pointerEvents="none"
          >
            {gate}
          </text>
        );
      })}

      {/* === Invisible tap targets on top === */}
      {Object.entries(GATE_ANCHORS).map(([gateStr, p]) => {
        const gate = Number(gateStr);
        return (
          <circle
            key={`hit-${gate}`}
            cx={p.x} cy={p.y} r={8}
            fill="transparent"
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              hapticTap('light');
              setTappedGate(tappedGate === gate ? null : gate);
              setTappedCenter(null);
              setTappedChannel(null);
            }}
          >
            <title>{`Gate ${gate} — ${gateName(gate)}`}</title>
          </circle>
        );
      })}

      {/* column labels */}
      <text x={6} y={H - 8} fontSize="9" fill="#666"
            fontFamily="var(--font-sans), Inter, sans-serif" style={{ letterSpacing: '0.18em' }}>
        DESIGN
      </text>
      <text x={W - 6} y={H - 8} fontSize="9" fill="#666" textAnchor="end"
            fontFamily="var(--font-sans), Inter, sans-serif" style={{ letterSpacing: '0.18em' }}>
        PERSONALITY
      </text>
    </svg>
    {tappedCenter && (() => {
      const meaning = CENTER_MEANINGS[tappedCenter];
      const isDefined = defined.has(tappedCenter);
      return (
        <div className="mt-3 border-l-2 pl-3 fade-in" style={{ borderLeftColor: isDefined ? '#8b3a3a' : '#3a3a3a' }}>
          <p className="small-label caps text-ink-faint">
            {meaning.name}
            <span className="ml-1.5 text-[10px]">· {isDefined ? 'defined' : 'undefined'}</span>
          </p>
          <p className="serif text-[14px] text-ink mt-1.5 leading-relaxed">
            {isDefined ? meaning.defined : meaning.undefined}
          </p>
          <button
            type="button"
            className="small-label caps text-ink-faint hover:text-ink mt-2"
            onClick={() => setTappedCenter(null)}
          >
            close
          </button>
        </div>
      );
    })()}
    {tappedGate && (() => {
      const center = centerOfGate(tappedGate);
      const isP = persGates.has(tappedGate);
      const isD = desGates.has(tappedGate);
      const activations = blueprint.humanDesign.activeGates.filter((g) => g.gate === tappedGate);
      const lit = isP || isD;
      return (
        <div className="mt-3 border-l-2 pl-3 fade-in" style={{ borderLeftColor: lit ? '#8b3a3a' : '#3a3a3a' }}>
          <p className="small-label caps text-ink-faint">
            gate <span className="text-ink">{tappedGate}</span> · <span className="text-accent">{gateName(tappedGate)}</span>
            <span className="ml-1.5 text-[10px]">in {centerLabel(center)}</span>
          </p>
          <p className="text-[12px] text-ink-dim caps mt-1" style={{ letterSpacing: '0.08em' }}>
            {isP && isD ? 'activated by both personality + design' : isP ? 'activated by personality' : isD ? 'activated by design' : 'not activated in your chart'}
          </p>
          {activations.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-[12px] text-ink-dim">
              {activations.map((a, i) => (
                <li key={i}>
                  <span className={a.chart === 'personality' ? 'text-ink' : 'text-accent'}>{a.planet}</span>{' '}
                  ({a.chart}) · line {a.line}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="small-label caps text-ink-faint hover:text-ink mt-2"
            onClick={() => setTappedGate(null)}
          >
            close
          </button>
        </div>
      );
    })()}
    {tappedChannel && (() => {
      const m = channelMeaning(tappedChannel.name, tappedChannel.a, tappedChannel.b);
      return (
        <div className="mt-3 border-l-2 pl-3 fade-in" style={{ borderLeftColor: '#8b3a3a' }}>
          <p className="small-label caps text-ink-faint">
            channel · <span className="text-accent">{tappedChannel.name}</span>
            <span className="ml-1.5 text-[10px]">{tappedChannel.a}–{tappedChannel.b}</span>
          </p>
          <p className="serif text-[14px] text-ink mt-1.5 leading-relaxed">
            {m || 'A defined channel in your design.'}
          </p>
          <button
            type="button"
            className="small-label caps text-ink-faint hover:text-ink mt-2"
            onClick={() => setTappedChannel(null)}
          >
            close
          </button>
        </div>
      );
    })()}
    </>
  );
}
