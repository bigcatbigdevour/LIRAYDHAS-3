'use client';

import type { Blueprint, CenterName } from '@/lib/types';
import { ALL_CHANNELS } from '@/lib/humandesign/channels';

// Canonical vertical bodygraph layout, 320 × 580 viewBox.
//
// Strategy: every gate is anchored at a fixed point on its center's
// perimeter. Points are chosen so that the line drawn between the two
// gates of any channel is close to a straight line through both centers'
// edges — i.e. channels look like channels, not random crisscrosses.

const W = 320;
const H = 580;

interface CenterDef {
  cx: number; cy: number;
  shape: 'triangle-up' | 'triangle-down' | 'square' | 'diamond';
  size: number;       // half-width of bounding box (square: half side; tri: base half)
  fill: string;
}

const CENTERS: Record<CenterName, CenterDef> = {
  Head:        { cx: 160, cy: 55,  shape: 'triangle-up',   size: 38, fill: '#a89a3a' },
  Ajna:        { cx: 160, cy: 130, shape: 'triangle-down', size: 38, fill: '#a89a3a' },
  Throat:      { cx: 160, cy: 210, shape: 'square',        size: 40, fill: '#6e553a' },
  G:           { cx: 160, cy: 310, shape: 'diamond',       size: 46, fill: '#a89a3a' },
  Heart:       { cx: 230, cy: 305, shape: 'triangle-up',   size: 30, fill: '#8b3a3a' },
  Sacral:      { cx: 160, cy: 410, shape: 'square',        size: 42, fill: '#8b3a3a' },
  SolarPlexus: { cx: 268, cy: 410, shape: 'triangle-down', size: 36, fill: '#6e553a' },
  Spleen:      { cx: 52,  cy: 410, shape: 'triangle-down', size: 36, fill: '#6e553a' },
  Root:        { cx: 160, cy: 510, shape: 'square',        size: 42, fill: '#6e553a' },
};

// Per-gate anchor: (x, y) in viewBox coordinates.
// Positioned at the perimeter point of each gate's center where its
// most-significant channel(s) enter from. Spread to avoid collisions.
const GATE_ANCHORS: Record<number, { x: number; y: number }> = {
  // === HEAD (bottom edge, 3 gates above Ajna's top three) ===
  64: { x: 142, y: 88 },
  61: { x: 160, y: 90 },
  63: { x: 178, y: 88 },

  // === AJNA (top edge mirroring Head; bottom edge mirroring Throat top) ===
  47: { x: 142, y: 102 },
  24: { x: 160, y: 100 },
  4:  { x: 178, y: 102 },
  17: { x: 145, y: 156 },
  43: { x: 160, y: 162 },
  11: { x: 175, y: 156 },

  // === THROAT (square) ===
  // Top edge (under Ajna's lower three):
  62: { x: 145, y: 174 },
  23: { x: 160, y: 174 },
  56: { x: 175, y: 174 },
  // Right edge (toward Solar Plexus):
  35: { x: 198, y: 196 },
  12: { x: 198, y: 220 },
  // Bottom edge (toward G — 31, 8, 33; toward Heart — 45):
  31: { x: 138, y: 246 },
  8:  { x: 154, y: 246 },
  33: { x: 170, y: 246 },
  45: { x: 188, y: 246 },
  // Left edge (toward Spleen 48; toward Sacral 34 / Spleen 57 / G 10 via 20):
  20: { x: 122, y: 220 },
  16: { x: 122, y: 196 },

  // === G CENTER (diamond) ===
  // Top corner area (toward Throat's bottom):
  7:  { x: 160, y: 270 },   // up to Throat 31
  1:  { x: 148, y: 281 },   // up to Throat 8
  13: { x: 172, y: 281 },   // up to Throat 33
  // Left vertex (toward Sacral 34 / Spleen 57 / Throat 20):
  10: { x: 122, y: 310 },
  // Right vertex (toward Heart):
  25: { x: 198, y: 310 },
  // Bottom-half (toward Sacral):
  15: { x: 136, y: 333 },   // down to Sacral 5
  2:  { x: 184, y: 333 },   // down to Sacral 14
  46: { x: 160, y: 350 },   // down to Sacral 29

  // === HEART (small triangle up) ===
  21: { x: 230, y: 286 },   // top → Throat 45
  51: { x: 214, y: 314 },   // left → G 25
  26: { x: 224, y: 326 },   // bottom-left → Spleen 44
  40: { x: 244, y: 326 },   // bottom-right → SP 37

  // === SACRAL (square) ===
  // Top edge (toward G), left to right:
  34: { x: 124, y: 372 },   // up-left toward Throat 20 / G 10 / Spleen 57
  5:  { x: 144, y: 372 },   // up to G 15
  14: { x: 160, y: 372 },   // up to G 2 (wait — channel 2-14, G 2 is at (184, 333), Sacral 14 at (160, 372))
  29: { x: 176, y: 372 },   // up to G 46
  // Right edge (toward SP):
  59: { x: 200, y: 400 },
  // Left edge (toward Spleen):
  27: { x: 120, y: 400 },
  // Bottom edge (toward Root):
  3:  { x: 145, y: 448 },   // down to Root 60
  9:  { x: 165, y: 448 },   // down to Root 52
  42: { x: 180, y: 448 },   // down to Root 53

  // === SOLAR PLEXUS (triangle pointing down) ===
  // Top edge of the triangle (faces Throat):
  22: { x: 290, y: 388 },   // up-right → Throat 12
  36: { x: 254, y: 388 },   // up-left → Throat 35
  // Left edge (toward Sacral, Heart):
  6:  { x: 246, y: 405 },   // → Sacral 59
  37: { x: 254, y: 418 },   // → Heart 40
  // Bottom-right tip (toward Root):
  49: { x: 250, y: 425 },   // → Root 19
  55: { x: 268, y: 440 },   // → Root 39
  30: { x: 286, y: 425 },   // → Root 41

  // === SPLEEN (triangle pointing down) ===
  // Top edge (toward Throat):
  48: { x: 70,  y: 388 },   // → Throat 16
  // Right edge (toward Sacral, G, Heart):
  57: { x: 84,  y: 392 },   // → Throat 20 / Sacral 34 / G 10
  44: { x: 84,  y: 408 },   // → Heart 26
  50: { x: 84,  y: 420 },   // → Sacral 27
  // Bottom-left tip (toward Root):
  32: { x: 66,  y: 432 },   // → Root 54
  28: { x: 50,  y: 440 },   // → Root 38
  18: { x: 32,  y: 432 },   // → Root 58

  // === ROOT (square) ===
  // Top edge (toward Sacral):
  53: { x: 180, y: 472 },   // up → Sacral 42
  60: { x: 160, y: 472 },   // up → Sacral 3 (note: channel 3-60, gate 3 at (145, 448), gate 60 at (160, 472) — slight skew)
  52: { x: 140, y: 472 },   // up → Sacral 9
  // Right edge (toward SP):
  41: { x: 200, y: 478 },   // up-right → SP 30
  39: { x: 200, y: 496 },   // up-right → SP 55
  19: { x: 200, y: 514 },   // up-right → SP 49
  // Left edge (toward Spleen):
  58: { x: 120, y: 478 },   // up-left → Spleen 18
  38: { x: 120, y: 496 },   // up-left → Spleen 28
  54: { x: 120, y: 514 },   // up-left → Spleen 32
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

export default function BodyGraph({ blueprint }: { blueprint: Blueprint }) {
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

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[340px] mx-auto block">
      {/* channels first (under shapes) — each as two half-segments so a
          hanging single gate shows as half-lit (grey). */}
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
        return (
          <g key={key}>
            <line
              x1={A.x} y1={A.y} x2={mid.x} y2={mid.y}
              stroke={isActive ? '#f4f1ea' : aActive ? '#888' : '#1c1c1c'}
              strokeWidth={isActive ? 1.5 : aActive ? 1.1 : 0.6}
            />
            <line
              x1={mid.x} y1={mid.y} x2={B.x} y2={B.y}
              stroke={isActive ? '#f4f1ea' : bActive ? '#888' : '#1c1c1c'}
              strokeWidth={isActive ? 1.5 : bActive ? 1.1 : 0.6}
            />
          </g>
        );
      })}

      {/* center shapes */}
      {(Object.keys(CENTERS) as CenterName[]).map((name) => {
        const c = CENTERS[name];
        const isDefined = defined.has(name);
        return (
          <path
            key={name}
            d={shapePath(name)}
            fill={isDefined ? c.fill : 'transparent'}
            fillOpacity={isDefined ? 0.92 : 0}
            stroke={isDefined ? c.fill : '#2a2a2a'}
            strokeWidth={isDefined ? 0 : 0.8}
          />
        );
      })}

      {/* gate numbers */}
      {Object.entries(GATE_ANCHORS).map(([gateStr, p]) => {
        const gate = Number(gateStr);
        const isP = persGates.has(gate);
        const isD = desGates.has(gate);
        const fill = isP && isD ? '#f4f1ea' : isP ? '#f4f1ea' : isD ? '#b22a2a' : '#3a3a3a';
        return (
          <text
            key={gate}
            x={p.x}
            y={p.y + 2.6}
            textAnchor="middle"
            fontSize="7.5"
            fill={fill}
            fontFamily="var(--font-sans), Inter, sans-serif"
          >
            {gate}
          </text>
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
  );
}
