'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { CYCLES, ageInYears } from '@/lib/cycles';

interface Props {
  birthIso: string;
  maxAge?: number;
}

interface Arc {
  cycleKey: string;
  color: string;
  a1: number;
  a2: number;
}

export default function ArcDiagram({ birthIso, maxAge = 85 }: Props) {
  const ref = useRef<SVGSVGElement | null>(null);
  const [hover, setHover] = useState<Arc | null>(null);

  useEffect(() => {
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();

    const W = 800;
    const H = 420;
    const margin = { top: 30, right: 16, bottom: 60, left: 16 };
    const innerW = W - margin.left - margin.right;
    const innerH = H - margin.top - margin.bottom;

    const x = d3.scaleLinear().domain([0, maxAge]).range([0, innerW]);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // bottom timeline axis
    g.append('line')
      .attr('x1', 0).attr('x2', innerW)
      .attr('y1', innerH).attr('y2', innerH)
      .attr('stroke', '#222').attr('stroke-width', 0.6);

    // decade labels
    g.selectAll('text.decade')
      .data(d3.range(0, maxAge + 1, 5))
      .enter()
      .append('text')
      .attr('class', 'decade')
      .attr('x', (d) => x(d))
      .attr('y', innerH + 14)
      .attr('text-anchor', 'middle')
      .attr('fill', '#555')
      .attr('font-size', 9)
      .text((d) => `${d}`);

    // collect arcs by cycle
    const allArcs: Arc[] = [];
    for (const c of CYCLES) {
      const events: number[] = [];
      for (let n = 0; n * c.yearLength <= maxAge; n++) {
        events.push(n * c.yearLength);
      }
      // Tick marks
      g.append('g')
        .selectAll('line')
        .data(events)
        .enter()
        .append('line')
        .attr('x1', (d) => x(d))
        .attr('x2', (d) => x(d))
        .attr('y1', innerH - 4)
        .attr('y2', innerH + 4)
        .attr('stroke', c.color)
        .attr('stroke-width', 0.7)
        .attr('opacity', 0.7);
      // arcs between every pair of consecutive events (and skip too-close pairs)
      for (let i = 0; i < events.length - 1; i++) {
        allArcs.push({
          cycleKey: c.key,
          color: c.color,
          a1: events[i],
          a2: events[i + 1],
        });
      }
    }

    // Group arcs by cycle for less visual chaos
    const arcG = g.append('g').attr('class', 'arcs');

    arcG
      .selectAll('path.arc')
      .data(allArcs)
      .enter()
      .append('path')
      .attr('class', 'arc')
      .attr('fill', 'none')
      .attr('stroke', (d) => d.color)
      .attr('stroke-width', 0.6)
      .attr('opacity', 0.55)
      .attr('d', (d) => {
        const x1 = x(d.a1);
        const x2 = x(d.a2);
        const cx = (x1 + x2) / 2;
        const r = (x2 - x1) / 2;
        const cy = innerH;
        return `M ${x1} ${cy} A ${r} ${r} 0 0 1 ${x2} ${cy}`;
      })
      .on('mouseover', function (_e, d) {
        d3.select(this).attr('opacity', 1).attr('stroke-width', 1.4);
        setHover(d);
      })
      .on('mouseout', function () {
        d3.select(this).attr('opacity', 0.55).attr('stroke-width', 0.6);
        setHover(null);
      });

    // today's age marker — with a slow opacity pulse to draw the eye
    const age = ageInYears(birthIso);
    const nowLine = g.append('line')
      .attr('x1', x(age)).attr('x2', x(age))
      .attr('y1', 0).attr('y2', innerH)
      .attr('stroke', '#f4f1ea').attr('stroke-width', 1);
    nowLine.append('animate')
      .attr('attributeName', 'opacity')
      .attr('values', '1;0.55;1')
      .attr('dur', '4.5s')
      .attr('repeatCount', 'indefinite');
    g.append('text')
      .attr('x', x(age))
      .attr('y', -8)
      .attr('text-anchor', 'middle')
      .attr('fill', '#f4f1ea')
      .attr('font-size', 10)
      .text(`now · ${age.toFixed(1)}y`);

    return () => {
      d3.select(ref.current).selectAll('*').remove();
    };
  }, [birthIso, maxAge]);

  return (
    <div className="relative">
      <svg ref={ref} viewBox="0 0 800 420" className="w-full" />
      {hover && (
        <div className="absolute top-1 right-2 text-[11px] text-ink-dim bg-bg px-2 py-1 border border-hairline">
          {hover.cycleKey} · {hover.a1.toFixed(1)} → {hover.a2.toFixed(1)} y
        </div>
      )}
      <div className="mt-4 grid grid-cols-2 gap-y-1 text-[10px]">
        {CYCLES.map((c) => (
          <div key={c.key} className="flex items-center gap-2">
            <span className="inline-block w-3 h-px" style={{ background: c.color }} />
            <span className="text-ink-dim">{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
