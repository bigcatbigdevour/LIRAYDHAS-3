'use client';

import type { Blueprint, CenterName } from '@/lib/types';
import { ALL_CHANNELS } from '@/lib/humandesign/channels';

// Canonical vertical bodygraph. All coordinates are in the SVG viewBox.
const W = 320;
const H = 580;

interface CenterDef {
  cx: number; cy: number;
  shape: 'triangle-up' | 'triangle-down' | 'square' | 'diamond';
  size: number;
  fill: string;
}

const CENTERS: Record<CenterName, CenterDef> = {
  Head:        { cx: 160, cy: 55,  shape: 'triangle-up',   size: 70, fill: '#a89a3a' },
  Ajna:        { cx: 160, cy: 130, shape: 'triangle-down', size: 70, fill: '#a89a3a' },
  Throat:      { cx: 160, cy: 210, shape: 'square',        size: 76, fill: '#6e553a' },
  G:           { cx: 160, cy: 310, shape: 'diamond',       size: 86, fill: '#a89a3a' },
  Heart:       { cx: 230, cy: 305, shape: 'triangle-up',   size: 56, fill: '#8b3a3a' },
  Sacral:      { cx: 160, cy: 410, shape: 'square',        size: 84, fill: '#8b3a3a' },
  SolarPlexus: { cx: 268, cy: 410, shape: 'triangle-down', size: 66, fill: '#6e553a' },
  Spleen:      { cx: 52,  cy: 410, shape: 'triangle-down', size: 66, fill: '#6e553a' },
  Root:        { cx: 160, cy: 510, shape: 'square',        size: 84, fill: '#6e553a' },
};

// (x, y) anchor for each of the 64 gates, placed on or near the perimeter of
// its center, oriented toward the partner center it channels with.
const GATE_ANCHORS: Record<number, { x: number; y: number }> = {
  // HEAD: bottom edge, splay across the triangle's base
  64: { x: 138, y: 80 },
  61: { x: 160, y: 88 },
  63: { x: 182, y: 80 },
  // AJNA top: facing Head
  47: { x: 138, y: 108 },
  24: { x: 160, y: 100 },
  4:  { x: 182, y: 108 },
  // AJNA bottom: facing Throat
  17: { x: 138, y: 152 },
  43: { x: 160, y: 160 },
  11: { x: 182, y: 152 },
  // THROAT top (under 17/43/11): 62, 23, 56
  62: { x: 138, y: 188 },
  23: { x: 160, y: 184 },
  56: { x: 182, y: 188 },
  // THROAT right edge (facing SolarPlexus): 35, 12
  35: { x: 196, y: 200 },
  12: { x: 196, y: 220 },
  // THROAT bottom (facing G + Heart + Spleen + Sacral): 45, 33, 8, 31
  45: { x: 188, y: 235 },
  33: { x: 174, y: 240 },
  8:  { x: 160, y: 244 },
  31: { x: 146, y: 240 },
  // THROAT left edge (facing Sacral + Spleen): 20, 16
  20: { x: 124, y: 220 },
  16: { x: 124, y: 200 },
  // G center (diamond) — anchor points distributed by partner
  7:  { x: 160, y: 274 },  // up toward Throat 31
  1:  { x: 145, y: 290 },  // toward Throat 8
  13: { x: 175, y: 290 },  // toward Throat 33
  25: { x: 200, y: 310 },  // right toward Heart 51
  10: { x: 122, y: 310 },  // left toward Sacral 34 / Throat 20 / Spleen 57
  46: { x: 160, y: 346 },  // down toward Sacral 29
  15: { x: 132, y: 326 },  // toward Sacral 5
  2:  { x: 188, y: 326 },  // toward Sacral 14
  // HEART (small triangle) — gates around its perimeter
  21: { x: 230, y: 286 },  // up to Throat 45
  51: { x: 212, y: 312 },  // left to G 25
  26: { x: 234, y: 318 },  // toward Spleen 44 (diagonal across — visually the channel routes via Heart's edges)
  40: { x: 246, y: 318 },  // toward SolarPlexus 37
  // SACRAL (top edge — facing G / Throat / Spleen / SP)
  34: { x: 130, y: 380 },  // toward Throat 20 / G 10 / Spleen 57
  5:  { x: 146, y: 376 },  // toward G 15
  14: { x: 162, y: 376 },  // toward G 2
  29: { x: 178, y: 376 },  // toward G 46
  9:  { x: 194, y: 380 },  // toward Root 52
  // SACRAL right edge: 42, 3, 59 toward SP and Root
  42: { x: 200, y: 400 },
  3:  { x: 200, y: 420 },
  59: { x: 200, y: 432 },
  // SACRAL bottom + left: 27 toward Spleen 50
  27: { x: 120, y: 408 },
  // SOLAR PLEXUS (triangle pointing down) — gates around its perimeter
  6:  { x: 246, y: 388 },  // up-left toward Sacral 59
  37: { x: 240, y: 396 },  // toward Heart 40
  22: { x: 288, y: 392 },  // up-right toward Throat 12
  36: { x: 252, y: 408 },  // toward Throat 35
  49: { x: 250, y: 426 },  // toward Root 19
  55: { x: 268, y: 432 },  // toward Root 39
  30: { x: 286, y: 426 },  // toward Root 41
  // SPLEEN (triangle pointing down) — gates
  48: { x: 70,  y: 388 },  // toward Throat 16
  57: { x: 78,  y: 392 },  // toward Throat 20 / G 10 / Sacral 34
  44: { x: 84,  y: 408 },  // toward Heart 26
  50: { x: 74,  y: 418 },  // toward Sacral 27
  32: { x: 52,  y: 426 },  // toward Root 54
  28: { x: 36,  y: 418 },  // toward Root 38
  18: { x: 28,  y: 408 },  // toward Root 58
  // ROOT (square top edge — facing centers above)
  41: { x: 196, y: 484 },  // toward SP 30
  39: { x: 178, y: 480 },  // toward SP 55
  19: { x: 222, y: 484 },  // toward SP 49
  53: { x: 138, y: 480 },  // toward Sacral 42
  60: { x: 160, y: 478 },  // toward Sacral 3
  52: { x: 184, y: 478 },  // toward Sacral 9
  58: { x: 122, y: 488 },  // toward Spleen 18
  38: { x: 106, y: 484 },  // toward Spleen 28
  54: { x: 92,  y: 488 },  // toward Spleen 32
};

function shapePath(name: CenterName): string {
  const c = CENTERS[name];
  const { cx, cy, size, shape } = c;
  const s = size / 2;
  switch (shape) {
    case 'triangle-up':
      return `M ${cx} ${cy - s} L ${cx + s} ${cy + s * 0.6} L ${cx - s} ${cy + s * 0.6} Z`;
    case 'triangle-down':
      return `M ${cx - s} ${cy - s * 0.6} L ${cx + s} ${cy - s * 0.6} L ${cx} ${cy + s} Z`;
    case 'square':
      return `M ${cx - s} ${cy - s} L ${cx + s} ${cy - s} L ${cx + s} ${cy + s} L ${cx - s} ${cy + s} Z`;
    case 'diamond':
      return `M ${cx} ${cy - s} L ${cx + s} ${cy} L ${cx} ${cy + s} L ${cx - s} ${cy} Z`;
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
      {/* channels — each as two half-segments anchored at each gate */}
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
              strokeWidth={isActive ? 1.5 : aActive ? 1.1 : 0.7}
            />
            <line
              x1={mid.x} y1={mid.y} x2={B.x} y2={B.y}
              stroke={isActive ? '#f4f1ea' : bActive ? '#888' : '#1c1c1c'}
              strokeWidth={isActive ? 1.5 : bActive ? 1.1 : 0.7}
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
            strokeWidth={isDefined ? 0 : 0.9}
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
