'use client';

import type { Blueprint, CenterName } from '@/lib/types';
import { ALL_CHANNELS } from '@/lib/humandesign/channels';

// A vertical bodygraph with the canonical positions and shapes.
// All coordinates are in the SVG viewBox; the consumer sizes us via CSS.

const W = 300;
const H = 540;

interface CenterDef {
  cx: number;
  cy: number;
  shape: 'triangle-up' | 'triangle-down' | 'square' | 'diamond';
  size: number;
  fill: string;
}

const CENTERS: Record<CenterName, CenterDef> = {
  Head:        { cx: 150, cy: 50,  shape: 'triangle-up',   size: 64, fill: '#a89a3a' },
  Ajna:        { cx: 150, cy: 120, shape: 'triangle-down', size: 64, fill: '#a89a3a' },
  Throat:      { cx: 150, cy: 200, shape: 'square',        size: 70, fill: '#6e553a' },
  G:           { cx: 150, cy: 290, shape: 'diamond',       size: 80, fill: '#a89a3a' },
  Heart:       { cx: 215, cy: 282, shape: 'triangle-up',   size: 52, fill: '#8b3a3a' },
  Sacral:      { cx: 150, cy: 380, shape: 'square',        size: 78, fill: '#8b3a3a' },
  SolarPlexus: { cx: 250, cy: 380, shape: 'triangle-down', size: 64, fill: '#6e553a' },
  Spleen:      { cx: 50,  cy: 380, shape: 'triangle-down', size: 64, fill: '#6e553a' },
  Root:        { cx: 150, cy: 475, shape: 'square',        size: 78, fill: '#6e553a' },
};

// Per-gate connection anchor points relative to each center's center.
// Each gate is anchored on the edge of its center, oriented toward the
// other center it canonically connects to. Distances are inside the
// shape so the channel line visibly enters/exits the shape.
const GATE_ANCHORS: Record<number, { x: number; y: number }> = {
  // ===== HEAD (3) =====
  64: pt('Head', -22, 10),
  61: pt('Head',   0, 14),
  63: pt('Head',  22, 10),
  // ===== AJNA (6) =====
  47: pt('Ajna', -22, -10),
  24: pt('Ajna',   0, -14),
  4:  pt('Ajna',  22, -10),
  17: pt('Ajna', -22, 10),
  43: pt('Ajna',   0, 14),
  11: pt('Ajna',  22, 10),
  // ===== THROAT (11) — gates around its rectangle =====
  62: pt('Throat', -28, -16),
  23: pt('Throat',  -8, -16),
  56: pt('Throat',  12, -16),
  35: pt('Throat',  28, -8),
  12: pt('Throat',  28,  6),
  45: pt('Throat',  20, 16),
  33: pt('Throat',   4, 16),
  8:  pt('Throat', -10, 16),
  31: pt('Throat', -22, 16),
  20: pt('Throat', -28,  6),
  16: pt('Throat', -28, -4),
  // ===== G (8) — diamond, 8 corners-ish =====
  7:  pt('G',   0, -28),
  1:  pt('G', -12, -18),
  13: pt('G',  12, -18),
  25: pt('G',  28,   0),
  10: pt('G', -28,   0),
  15: pt('G', -12,  18),
  2:  pt('G',  12,  18),
  46: pt('G',   0,  28),
  // ===== HEART (4) =====
  21: pt('Heart', -8, -20),
  26: pt('Heart',  8, -20),
  40: pt('Heart', 14, 12),
  51: pt('Heart', -14, 12),
  // ===== SACRAL (9) =====
  34: pt('Sacral', -32, -10),
  5:  pt('Sacral', -20, -22),
  14: pt('Sacral',  -6, -22),
  29: pt('Sacral',   8, -22),
  9:  pt('Sacral',  20, -22),
  3:  pt('Sacral',  32, -10),
  42: pt('Sacral',  32,  6),
  27: pt('Sacral',   0, 22),
  59: pt('Sacral',  32, 22),
  // ===== SOLAR PLEXUS (7) =====
  6:  pt('SolarPlexus',  -22, -16),
  37: pt('SolarPlexus',  -8, -16),
  22: pt('SolarPlexus',  -22, 4),
  36: pt('SolarPlexus',  -8, 14),
  49: pt('SolarPlexus',  10, 14),
  55: pt('SolarPlexus',  18, -4),
  30: pt('SolarPlexus',  18, 6),
  // ===== SPLEEN (7) =====
  48: pt('Spleen',  22, -8),
  57: pt('Spleen',  22, 4),
  44: pt('Spleen',   2, -16),
  50: pt('Spleen',  -16, -8),
  32: pt('Spleen',  -16, 6),
  28: pt('Spleen',   2, 16),
  18: pt('Spleen',  16, 14),
  // ===== ROOT (9) =====
  41: pt('Root',  -32, -10),
  19: pt('Root',  -20, -22),
  39: pt('Root',  -6, -22),
  53: pt('Root',   8, -22),
  60: pt('Root',  20, -22),
  52: pt('Root',  32, -10),
  58: pt('Root', -32, 14),
  38: pt('Root',  -10, 22),
  54: pt('Root',  24, 14),
};

function pt(name: CenterName, dx: number, dy: number) {
  const c = CENTERS[name];
  return { x: c.cx + dx, y: c.cy + dy };
}

function shapePath(name: CenterName): string {
  const c = CENTERS[name];
  const { cx, cy, size, shape } = c;
  const s = size / 2;
  switch (shape) {
    case 'triangle-up':
      return `M ${cx} ${cy - s} L ${cx + s} ${cy + s * 0.65} L ${cx - s} ${cy + s * 0.65} Z`;
    case 'triangle-down':
      return `M ${cx - s} ${cy - s * 0.65} L ${cx + s} ${cy - s * 0.65} L ${cx} ${cy + s} Z`;
    case 'square':
      return `M ${cx - s} ${cy - s} L ${cx + s} ${cy - s} L ${cx + s} ${cy + s} L ${cx - s} ${cy + s} Z`;
    case 'diamond':
      return `M ${cx} ${cy - s} L ${cx + s} ${cy} L ${cx} ${cy + s} L ${cx - s} ${cy} Z`;
  }
}

export default function BodyGraph({ blueprint }: { blueprint: Blueprint }) {
  const defined = new Set(blueprint.humanDesign.definedCenters);
  const activeGates = new Set(blueprint.humanDesign.activeGates.map((g) => g.gate));
  // Track personality vs design separately to half-color hanging gates.
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
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[320px] mx-auto block">
      {/* channel lines first — each channel is two half-segments anchored at each gate. */}
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
              strokeWidth={isActive ? 1.4 : aActive ? 1 : 0.8}
            />
            <line
              x1={mid.x} y1={mid.y} x2={B.x} y2={B.y}
              stroke={isActive ? '#f4f1ea' : bActive ? '#888' : '#1c1c1c'}
              strokeWidth={isActive ? 1.4 : bActive ? 1 : 0.8}
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
            fillOpacity={isDefined ? 0.9 : 0}
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
        const color = isP && isD ? '#f4f1ea' : isP ? '#f4f1ea' : isD ? '#b22a2a' : '#3a3a3a';
        return (
          <text
            key={gate}
            x={p.x}
            y={p.y + 2.4}
            textAnchor="middle"
            fontSize="7"
            fill={color}
            fontFamily="var(--font-sans), Inter, sans-serif"
          >
            {gate}
          </text>
        );
      })}

      <text x={4} y={H - 6} fontSize="8" fill="#666" fontFamily="var(--font-sans), Inter, sans-serif"
            style={{ letterSpacing: '0.15em' }}>
        DESIGN
      </text>
      <text x={W - 4} y={H - 6} fontSize="8" fill="#666" textAnchor="end" fontFamily="var(--font-sans), Inter, sans-serif"
            style={{ letterSpacing: '0.15em' }}>
        PERSONALITY
      </text>
    </svg>
  );
}
