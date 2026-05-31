'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { CYCLES, ageInYears } from '@/lib/cycles';
import { LIFE_STATIONS } from '@/lib/lifeStations';
import { LIFE_CHAPTERS } from '@/lib/lifeChapters';

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
  onSelectStation?: (age: number) => void;
  /** If set, treat this age as the "focus" for active-arc highlighting and station markers, in addition to drawing the real today-marker. */
  focusAge?: number | null;
}

interface Arc extends ArcSelection {
  index: number;
}

export default function ArcDiagram({ birthIso, maxAge = 92, selected, onSelect, onSelectStation, focusAge }: Props) {
  const ref = useRef<SVGSVGElement | null>(null);
  const [hover, setHover] = useState<Arc | null>(null);

  // Keep latest props in refs so the static effect can read them without re-firing.
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onSelectStationRef = useRef(onSelectStation);
  onSelectStationRef.current = onSelectStation;

  // Layout constants used in both effects.
  const W = 800;
  const H = 420;
  const margin = { top: 30, right: 16, bottom: 60, left: 16 };
  const innerW = W - margin.left - margin.right;
  const innerH = H - margin.top - margin.bottom;
  const x = d3.scaleLinear().domain([0, maxAge]).range([0, innerW]);

  // === Heavy effect: build the static chart once (or when birth changes). ===
  useEffect(() => {
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const age = ageInYears(birthIso);

    // baseline
    g.append('line')
      .attr('x1', 0).attr('x2', innerW)
      .attr('y1', innerH).attr('y2', innerH)
      .attr('stroke', '#222').attr('stroke-width', 0.6);

    // decade labels every 5 years
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
      for (let n = 0; n * c.yearLength <= maxAge; n++) events.push(n * c.yearLength);
      g.append('g')
        .selectAll('line.tick')
        .data(events)
        .enter()
        .append('line')
        .attr('class', 'tick')
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
    arcG
      .selectAll('path.arc')
      .data(allArcs)
      .enter()
      .append('path')
      .attr('class', 'arc')
      .attr('fill', 'none')
      .attr('stroke', (d) => d.color)
      .attr('stroke-width', 0.7)
      .attr('opacity', 0)
      .attr('cursor', 'pointer')
      .attr('data-cycle', (d) => d.cycleKey)
      .attr('data-nth', (d) => d.nthCycle)
      .attr('data-age-start', (d) => d.ageStart)
      .attr('data-age-end', (d) => d.ageEnd)
      .attr('d', (d) => {
        const x1 = x(d.ageStart);
        const x2 = x(d.ageEnd);
        const r = (x2 - x1) / 2;
        const cy = innerH;
        return `M ${x1} ${cy} A ${r} ${r} 0 0 1 ${x2} ${cy}`;
      })
      .each(function () {
        const len = (this as SVGPathElement).getTotalLength?.() ?? 200;
        d3.select(this)
          .attr('stroke-dasharray', `${len} ${len}`)
          .attr('stroke-dashoffset', len);
      })
      .on('mouseover', function (_e, d) { setHover(d); })
      .on('mouseout', function () { setHover(null); })
      .on('click', function (_e, d) {
        const sel = selectedRef.current;
        if (sel && sel.cycleKey === d.cycleKey && sel.nthCycle === d.nthCycle) {
          onSelectRef.current?.(null);
        } else {
          onSelectRef.current?.({
            cycleKey: d.cycleKey,
            cycleLabel: d.cycleLabel,
            color: d.color,
            nthCycle: d.nthCycle,
            ageStart: d.ageStart,
            ageEnd: d.ageEnd,
          });
        }
      });

    // Draw-in animation, staggered by start age.
    arcG.selectAll<SVGPathElement, Arc>('path.arc')
      .transition()
      .duration(900)
      .delay((d) => Math.min(800, d.ageStart * 9))
      .ease(d3.easeCubicOut)
      .attr('opacity', 0.5)
      .attr('stroke-dashoffset', 0);

    // Chapter bands (initial state — will be re-themed by the focus effect)
    const chapterG = g.append('g').attr('class', 'chapters');
    for (const ch of LIFE_CHAPTERS) {
      if (ch.startAge >= maxAge) continue;
      const x1 = x(Math.max(0, ch.startAge));
      const x2 = x(Math.min(maxAge, ch.endAge));
      chapterG.append('line')
        .attr('class', 'chapter-band')
        .attr('x1', x1 + 1).attr('x2', x2 - 1)
        .attr('y1', innerH + 28).attr('y2', innerH + 28)
        .attr('stroke', '#3a3a3a')
        .attr('stroke-width', 0.8)
        .attr('opacity', 0.5)
        .attr('data-start', ch.startAge)
        .attr('data-end', ch.endAge)
        .attr('data-label', ch.label);
    }
    // chapter label placeholder
    chapterG.append('text')
      .attr('class', 'chapter-label')
      .attr('y', innerH + 42)
      .attr('text-anchor', 'middle')
      .attr('fill', '#8b3a3a')
      .attr('font-size', 9)
      .text('');

    // Station diamonds
    const stationY = -2;
    const stationG = g.append('g').attr('class', 'stations');
    stationG.selectAll('rect.station')
      .data(LIFE_STATIONS)
      .enter()
      .append('rect')
      .attr('class', 'station')
      .attr('x', (s) => x(s.age) - 3)
      .attr('y', stationY - 3)
      .attr('width', 6)
      .attr('height', 6)
      .attr('transform', (s) => `rotate(45 ${x(s.age)} ${stationY})`)
      .attr('fill', '#3a3a3a')
      .attr('opacity', 0.7)
      .attr('cursor', onSelectStationRef.current ? 'pointer' : 'default')
      .attr('data-age', (s) => s.age)
      .on('click', function (_e, s) { onSelectStationRef.current?.(s.age); })
      .append('title')
      .text((s) => `${s.label} — age ${s.age}`);

    // today marker (white)
    const nowLine = g.append('line')
      .attr('class', 'now-line')
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
      .attr('class', 'now-label')
      .attr('x', x(age))
      .attr('y', -8)
      .attr('text-anchor', 'middle')
      .attr('fill', '#f4f1ea')
      .attr('font-size', 10)
      .attr('opacity', 0)
      .text(`now · ${age.toFixed(1)}y`);
    nowText.transition().delay(1300).duration(500).attr('opacity', 1);

    // Focus line container — pre-create, position later
    g.append('g').attr('class', 'focus-group');
    return () => {
      d3.select(ref.current).selectAll('*').remove();
    };
    // Deliberately ONLY depend on birthIso + maxAge. selected/onSelect are read
    // via refs so we don't tear down the entire chart on every interaction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [birthIso, maxAge]);

  // === Light effect: update only focus-driven visuals when focusAge or selected changes. ===
  useEffect(() => {
    const svg = d3.select(ref.current);
    if (svg.empty()) return;
    const g = svg.select<SVGGElement>('g');
    if (g.empty()) return;

    const age = ageInYears(birthIso);
    const focus = focusAge ?? age;

    function isActiveArc(d: Arc): boolean {
      return focus >= d.ageStart && focus < d.ageEnd;
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

    // Update arc opacity + stroke-width based on focus + selection
    g.selectAll<SVGPathElement, Arc>('path.arc')
      .each(function (d) {
        d3.select(this)
          .attr('opacity', opacityFor(d))
          .attr('stroke-width', widthFor(d));
      });

    // Update station diamonds
    g.selectAll<SVGRectElement, typeof LIFE_STATIONS[number]>('rect.station')
      .attr('fill', (s) => Math.abs(focus - s.age) < 2 ? '#8b3a3a' : '#3a3a3a')
      .attr('opacity', (s) => Math.abs(focus - s.age) < 2 ? 0.95 : 0.7);

    // Update chapter bands
    g.selectAll<SVGLineElement, unknown>('line.chapter-band')
      .attr('stroke', function () {
        const startAge = parseFloat(this.getAttribute('data-start') ?? '0');
        const endAge = parseFloat(this.getAttribute('data-end') ?? '0');
        return focus >= startAge && focus < endAge ? '#8b3a3a' : '#3a3a3a';
      })
      .attr('stroke-width', function () {
        const startAge = parseFloat(this.getAttribute('data-start') ?? '0');
        const endAge = parseFloat(this.getAttribute('data-end') ?? '0');
        return focus >= startAge && focus < endAge ? 2 : 0.8;
      })
      .attr('opacity', function () {
        const startAge = parseFloat(this.getAttribute('data-start') ?? '0');
        const endAge = parseFloat(this.getAttribute('data-end') ?? '0');
        return focus >= startAge && focus < endAge ? 0.95 : 0.5;
      });

    // Chapter label
    let activeChapter: typeof LIFE_CHAPTERS[number] | null = null;
    for (const ch of LIFE_CHAPTERS) {
      if (focus >= ch.startAge && focus < ch.endAge) { activeChapter = ch; break; }
    }
    if (activeChapter) {
      const x1 = x(Math.max(0, activeChapter.startAge));
      const x2 = x(Math.min(maxAge, activeChapter.endAge));
      g.select('text.chapter-label')
        .attr('x', (x1 + x2) / 2)
        .text(activeChapter.label);
    } else {
      g.select('text.chapter-label').text('');
    }

    // Focus marker — only when scrubbing to a different age
    const focusGroup = g.select<SVGGElement>('g.focus-group');
    focusGroup.selectAll('*').remove();
    if (focusAge !== undefined && focusAge !== null && Math.abs(focusAge - age) > 0.05) {
      const fLine = focusGroup.append('line')
        .attr('x1', x(focus)).attr('x2', x(focus))
        .attr('y1', 0).attr('y2', innerH)
        .attr('stroke', '#8b3a3a').attr('stroke-width', 1.2)
        .attr('stroke-dasharray', '4 3');
      fLine.append('animate')
        .attr('attributeName', 'opacity')
        .attr('values', '1;0.6;1')
        .attr('dur', '3s')
        .attr('repeatCount', 'indefinite');
      focusGroup.append('text')
        .attr('x', x(focus))
        .attr('y', innerH + 60)
        .attr('text-anchor', 'middle')
        .attr('fill', '#8b3a3a')
        .attr('font-size', 10)
        .text(`focus · ${focus.toFixed(1)}y`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusAge, selected, birthIso, maxAge]);

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
            <span className="serif text-[11px] text-ink-dim" aria-hidden>{c.glyph}</span>
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
