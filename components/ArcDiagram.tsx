'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { CYCLES, ageInYears } from '@/lib/cycles';

export interface ArcSelection {
  cycleKey: string;
  cycleLabel: string;
  color: string;
  /** which iteration of this cycle (1 = first, 2 = second, etc.) */
  nthCycle: number;
  ageStart: number;
  ageEnd: number;
}

interface Props {
  birthIso: string;
  maxAge?: number;
  selected?: ArcSelection | null;
  onSelect?: (sel: ArcSelection | null) => void;
}

interface Arc extends ArcSelection {
  /** index across all arcs, for unique React keys & DOM ids */
  index: number;
}

export default function ArcDiagram({ birthIso, maxAge = 85, selected, onSelect }: Props) {
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

    // baseline
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

    // collect arcs
    const allArcs: Arc[] = [];
    let idx = 0;
    for (const c of CYCLES) {
      const events: number[] = [];
      for (let n = 0; n * c.yearLength <= maxAge; n++) {
        events.push(n * c.yearLength);
      }
      // tick marks at each return event
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

      for (let i = 0; i < events.length - 1; i++) {
        allArcs.push({
          index: idx++,
          cycleKey: c.key,
          cycleLabel: c.label,
          color: c.color,
          nthCycle: i + 1,
          ageStart: events[i],
          ageEnd: events[i + 1],
        });
      }
    }

    const arcG = g.append('g').attr('class', 'arcs');

    const age = ageInYears(birthIso);
    function isActiveArc(d: Arc): boolean {
      return age >= d.ageStart && age < d.ageEnd;
    }
    function strokeFor(d: Arc): string {
      return d.color;
    }
    function opacityFor(d: Arc): number {
      const isSel = selected && selected.cycleKey === d.cycleKey && selected.nthCycle === d.nthCycle;
      if (selected && !isSel) return 0.18;
      if (isActiveArc(d)) return 0.95;
      return 0.5;
    }
    function widthFor(d: Arc): number {
      const isSel = selected && selected.cycleKey === d.cycleKey && selected.nthCycle === d.nthCycle;
      if (isSel) return 2;
      if (isActiveArc(d)) return 1.3;
      return 0.7;
    }

    function commit(d: Arc) {
      // toggle off if already selected, else select
      if (selected && selected.cycleKey === d.cycleKey && selected.nthCycle === d.nthCycle) {
        onSelect?.(null);
      } else {
        onSelect?.({
          cycleKey: d.cycleKey,
          cycleLabel: d.cycleLabel,
          color: d.color,
          nthCycle: d.nthCycle,
          ageStart: d.ageStart,
          ageEnd: d.ageEnd,
        });
      }
    }

    arcG
      .selectAll('path.arc')
      .data(allArcs)
      .enter()
      .append('path')
      .attr('class', 'arc')
      .attr('fill', 'none')
      .attr('stroke', strokeFor)
      .attr('stroke-width', widthFor)
      .attr('opacity', 0)
      .attr('cursor', 'pointer')
      .attr('d', (d) => {
        const x1 = x(d.ageStart);
        const x2 = x(d.ageEnd);
        const cx = (x1 + x2) / 2;
        const r = (x2 - x1) / 2;
        const cy = innerH;
        return `M ${x1} ${cy} A ${r} ${r} 0 0 1 ${x2} ${cy}`;
      })
      .each(function () {
        // Set stroke-dasharray = path length so the "draw-in" animation
        // can interpolate from 0 to full length.
        const len = (this as SVGPathElement).getTotalLength?.() ?? 200;
        d3.select(this)
          .attr('stroke-dasharray', `${len} ${len}`)
          .attr('stroke-dashoffset', len);
      })
      .on('mouseover', function (_e, d) {
        setHover(d);
      })
      .on('mouseout', function () {
        setHover(null);
      })
      // pointer/touch — Safari fires "click" on tap so this works for iOS too
      .on('click', function (_e, d) {
        commit(d);
      });

    // Animate arcs in: draw-in by stroke-dashoffset, staggered slightly by
    // age so the chart "writes itself" from left (birth) to right (now).
    arcG
      .selectAll<SVGPathElement, Arc>('path.arc')
      .transition()
      .duration(900)
      .delay((d) => Math.min(800, d.ageStart * 9))
      .ease(d3.easeCubicOut)
      .attr('opacity', opacityFor)
      .attr('stroke-dashoffset', 0);

    // Continuous gentle breathing pulse on the active arcs (the ones the
    // user is inside right now). Pure SVG <animate> so it doesn't tax the
    // main thread.
    arcG
      .selectAll<SVGPathElement, Arc>('path.arc')
      .filter((d) => isActiveArc(d) && !(selected && selected.cycleKey === d.cycleKey && selected.nthCycle === d.nthCycle))
      .append('animate')
      .attr('attributeName', 'opacity')
      .attr('values', '0.95;0.55;0.95')
      .attr('dur', '5.5s')
      .attr('repeatCount', 'indefinite');

    // today's age marker — slow opacity pulse, animated entry
    const nowLine = g.append('line')
      .attr('x1', x(age)).attr('x2', x(age))
      .attr('y1', 0).attr('y2', 0)
      .attr('stroke', '#f4f1ea').attr('stroke-width', 1);
    nowLine.transition()
      .delay(900)
      .duration(800)
      .ease(d3.easeCubicOut)
      .attr('y2', innerH);
    nowLine.append('animate')
      .attr('attributeName', 'opacity')
      .attr('values', '1;0.55;1')
      .attr('dur', '4.5s')
      .attr('repeatCount', 'indefinite');
    const nowText = g.append('text')
      .attr('x', x(age))
      .attr('y', -8)
      .attr('text-anchor', 'middle')
      .attr('fill', '#f4f1ea')
      .attr('font-size', 10)
      .attr('opacity', 0)
      .text(`now · ${age.toFixed(1)}y`);
    nowText.transition().delay(1300).duration(500).attr('opacity', 1);

    return () => {
      d3.select(ref.current).selectAll('*').remove();
    };
  }, [birthIso, maxAge, selected, onSelect]);

  return (
    <div className="relative">
      <svg ref={ref} viewBox="0 0 800 420" className="w-full" />
      {hover && !selected && (
        <div className="absolute top-1 right-2 text-[11px] text-ink-dim bg-bg px-2 py-1 border border-hairline">
          {hover.cycleLabel.toLowerCase()} · ages {hover.ageStart.toFixed(1)}–{hover.ageEnd.toFixed(1)}
        </div>
      )}
      <div className="mt-4 grid grid-cols-2 gap-y-1 text-[10px]">
        {CYCLES.map((c) => (
          <button
            key={c.key}
            type="button"
            className="flex items-center gap-2 text-left"
            onClick={() => {
              // select the FIRST arc of this cycle as a way to scroll the
              // detail panel to this cycle's most relevant section
              const firstEnd = c.yearLength;
              onSelect?.({
                cycleKey: c.key,
                cycleLabel: c.label,
                color: c.color,
                nthCycle: 1,
                ageStart: 0,
                ageEnd: firstEnd,
              });
            }}
          >
            <span className="inline-block w-3 h-px" style={{ background: c.color }} />
            <span className={selected?.cycleKey === c.key ? 'text-ink' : 'text-ink-dim'}>
              {c.label}
            </span>
          </button>
        ))}
      </div>
      {selected && (
        <button
          type="button"
          onClick={() => onSelect?.(null)}
          className="mt-2 small-label caps text-ink-faint hover:text-ink"
        >
          clear selection
        </button>
      )}
    </div>
  );
}
