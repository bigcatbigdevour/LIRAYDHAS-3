'use client';

import type { Blueprint, PlanetName } from '@/lib/types';

const PLANET_ORDER: PlanetName[] = [
  'Sun', 'Earth', 'NorthNode', 'SouthNode', 'Moon',
  'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn',
  'Uranus', 'Neptune', 'Pluto',
];

const GLYPH: Record<PlanetName, string> = {
  Sun: '☉', Earth: '⊕', Moon: '☽', NorthNode: '☊', SouthNode: '☋',
  Mercury: '☿', Venus: '♀', Mars: '♂', Jupiter: '♃', Saturn: '♄',
  Uranus: '♅', Neptune: '♆', Pluto: '♇', Chiron: '⚷',
};

export default function ActivationColumns({ blueprint }: { blueprint: Blueprint }) {
  const personality = new Map(blueprint.humanDesign.activeGates
    .filter((g) => g.chart === 'personality')
    .map((g) => [g.planet, g]));
  const design = new Map(blueprint.humanDesign.activeGates
    .filter((g) => g.chart === 'design')
    .map((g) => [g.planet, g]));

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-x-3 gap-y-1 text-[12px]">
      <div className="col-span-3 grid grid-cols-[1fr_auto_1fr] gap-x-3 pb-2 border-b border-hairline">
        <div className="text-accent caps small-label text-left">design</div>
        <div className="caps small-label">·</div>
        <div className="caps small-label text-right">personality</div>
      </div>
      {PLANET_ORDER.map((p) => {
        const d = design.get(p);
        const per = personality.get(p);
        return (
          <div key={p} className="contents">
            <div className="tabular-nums text-left text-accent">
              {d ? `${d.gate}.${d.line}` : '—'}
            </div>
            <div className="text-ink-faint">
              <span className="text-ink-dim">{GLYPH[p]}</span>
            </div>
            <div className="tabular-nums text-right text-ink">
              {per ? `${per.gate}.${per.line}` : '—'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
