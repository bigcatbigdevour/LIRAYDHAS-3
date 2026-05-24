'use client';

import type { Blueprint, CenterName } from '@/lib/types';
import { ALL_CHANNELS } from '@/lib/humandesign/channels';
import { CENTER_GATES } from '@/lib/humandesign/centers';

// Pixel layout for a vertical bodygraph, 280 wide × 460 tall.
// Coordinates are the (cx, cy) centers of each shape.
interface CenterLayout {
  cx: number; cy: number;
  shape: 'triangle-up' | 'triangle-down' | 'square' | 'diamond';
  size: number;
  fill: string;
  label: string;
  /** gate → (x, y) inside or just outside the shape, anchor side */
  gates: Record<number, { x: number; y: number; side: 'in' | 'out' }>;
}

const W = 280;
const H = 480;

const COLORS: Record<CenterName, string> = {
  Head:        '#9c8a3a',
  Ajna:        '#9c8a3a',
  Throat:      '#6e553a',
  G:           '#9c8a3a',
  Heart:       '#8b3a3a',
  Sacral:      '#8b3a3a',
  SolarPlexus: '#6e553a',
  Spleen:      '#6e553a',
  Root:        '#6e553a',
};

// Approximate canonical positions: head at top, root at bottom, vertical axis.
function buildLayout(): Record<CenterName, CenterLayout> {
  const midX = W / 2;
  return {
    Head:        { cx: midX, cy: 50,  shape: 'triangle-up',   size: 60, fill: COLORS.Head,        label: 'Head', gates: {} },
    Ajna:        { cx: midX, cy: 110, shape: 'triangle-down', size: 60, fill: COLORS.Ajna,        label: 'Ajna', gates: {} },
    Throat:      { cx: midX, cy: 175, shape: 'square',        size: 64, fill: COLORS.Throat,      label: 'Throat', gates: {} },
    G:           { cx: midX, cy: 250, shape: 'diamond',       size: 70, fill: COLORS.G,           label: 'G', gates: {} },
    Heart:       { cx: midX + 60, cy: 248, shape: 'triangle-up', size: 50, fill: COLORS.Heart, label: 'Heart', gates: {} },
    Sacral:      { cx: midX, cy: 335, shape: 'square',        size: 70, fill: COLORS.Sacral,      label: 'Sacral', gates: {} },
    SolarPlexus: { cx: midX + 95, cy: 335, shape: 'triangle-down', size: 60, fill: COLORS.SolarPlexus, label: 'Solar Plexus', gates: {} },
    Spleen:      { cx: midX - 95, cy: 335, shape: 'triangle-down', size: 60, fill: COLORS.Spleen, label: 'Spleen', gates: {} },
    Root:        { cx: midX, cy: 425, shape: 'square',        size: 70, fill: COLORS.Root,        label: 'Root', gates: {} },
  };
}

// Pre-compute the position of each gate along the perimeter of its center,
// placed deterministically so each appears near the channel(s) it belongs to.
// For drawing channels we just connect center → center; we use gate positions
// only for the small numbers.
function gateLabelPositions(layout: Record<CenterName, CenterLayout>) {
  const out: Record<number, { x: number; y: number; center: CenterName }> = {};
  for (const [center, gates] of Object.entries(CENTER_GATES) as [CenterName, number[]][]) {
    const c = layout[center];
    const n = gates.length;
    // distribute on a small ring outside the shape
    gates.forEach((g, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const r = c.size / 2 + 14;
      out[g] = {
        x: c.cx + r * Math.cos(angle),
        y: c.cy + r * Math.sin(angle),
        center,
      };
    });
  }
  return out;
}

function shapePath(c: CenterLayout): string {
  const { cx, cy, size, shape } = c;
  const s = size / 2;
  switch (shape) {
    case 'triangle-up':
      return `M ${cx} ${cy - s} L ${cx + s} ${cy + s} L ${cx - s} ${cy + s} Z`;
    case 'triangle-down':
      return `M ${cx - s} ${cy - s} L ${cx + s} ${cy - s} L ${cx} ${cy + s} Z`;
    case 'square':
      return `M ${cx - s} ${cy - s} L ${cx + s} ${cy - s} L ${cx + s} ${cy + s} L ${cx - s} ${cy + s} Z`;
    case 'diamond':
      return `M ${cx} ${cy - s} L ${cx + s} ${cy} L ${cx} ${cy + s} L ${cx - s} ${cy} Z`;
  }
}

export default function BodyGraph({ blueprint }: { blueprint: Blueprint }) {
  const layout = buildLayout();
  const gatePos = gateLabelPositions(layout);
  const defined = new Set(blueprint.humanDesign.definedCenters);
  const activeGates = new Set(blueprint.humanDesign.activeGates.map((g) => g.gate));
  const activeChannels = new Set(
    blueprint.humanDesign.activeChannels.map((p) => p.slice().sort((a, b) => a - b).join('-')),
  );

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[300px]">
        {/* channels first (under shapes) */}
        {ALL_CHANNELS.map((ch) => {
          const [a, b] = ch.gates;
          const key = [a, b].sort((x, y) => x - y).join('-');
          const isActive = activeChannels.has(key);
          const ca = layout[ch.centers[0]];
          const cb = layout[ch.centers[1]];
          return (
            <line
              key={key}
              x1={ca.cx} y1={ca.cy}
              x2={cb.cx} y2={cb.cy}
              stroke={isActive ? '#f4f1ea' : '#1c1c1c'}
              strokeWidth={isActive ? 1.4 : 0.8}
            />
          );
        })}
        {/* center shapes */}
        {(Object.entries(layout) as [CenterName, CenterLayout][]).map(([name, c]) => {
          const isDefined = defined.has(name);
          return (
            <g key={name}>
              <path
                d={shapePath(c)}
                fill={isDefined ? c.fill : 'transparent'}
                fillOpacity={isDefined ? 0.85 : 0}
                stroke={isDefined ? c.fill : '#333'}
                strokeWidth={isDefined ? 0 : 0.8}
              />
            </g>
          );
        })}
        {/* gate numbers — small, near each center's perimeter */}
        {Object.entries(gatePos).map(([gateStr, p]) => {
          const gate = Number(gateStr);
          const active = activeGates.has(gate);
          return (
            <text
              key={gate}
              x={p.x}
              y={p.y + 3}
              textAnchor="middle"
              fontSize="7"
              fill={active ? '#f4f1ea' : '#444'}
              fontFamily="var(--font-sans), Inter, sans-serif"
            >
              {gate}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
