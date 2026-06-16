'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { CYCLES, ageInYears } from '@/lib/cycles';
import { LIFE_STATIONS } from '@/lib/lifeStations';
import { LIFE_CHAPTERS } from '@/lib/lifeChapters';
import { CYCLE_PLAIN_LABELS } from '@/lib/cyclePlainLabels';

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
  const H = 460;
  const margin = { top: 30, right: 16, bottom: 100, left: 16 };
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
      // returns at every multiple of yearLength. Push events up to AND
      // INCLUDING the first one past maxAge so the final partial arc
      // (the one the user might be inside in their late years) is drawn.
      const events: number[] = [];
      let n = 0;
      while (n * c.yearLength <= maxAge) {
        events.push(n * c.yearLength);
        n++;
      }
      // include the next return past maxAge so the trailing arc is drawn
      events.push(n * c.yearLength);

      // Only draw ticks for returns that actually land inside the lifespan
      // (we don't want a tick mark hanging off the right edge for a cycle
      // whose next return is at age 97).
      const visibleTicks = events.filter((e) => e <= maxAge);
      g.append('g')
        .selectAll('line.tick')
        .data(visibleTicks)
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
        // Skip arcs whose entire span sits past maxAge.
        if (events[i] >= maxAge) continue;
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

    // Draw-in animation, staggered by start age. Only animates stroke-
    // dashoffset (the visual "writing" effect) — opacity is left to the
    // light effect so active-arc highlighting wins from the start.
    arcG.selectAll<SVGPathElement, Arc>('path.arc')
      .attr('opacity', 0.5)  // initial default; light effect will override
      .transition()
      .duration(900)
      .delay((d) => Math.min(800, d.ageStart * 9))
      .ease(d3.easeCubicOut)
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

    // today marker (white) — thicker, more contrast
    const nowLine = g.append('line')
      .attr('class', 'now-line')
      .attr('x1', x(age)).attr('x2', x(age))
      .attr('y1', 0).attr('y2', 0)
      .attr('stroke', '#f4f1ea').attr('stroke-width', 1.5);
    nowLine.transition()
      .delay(900)
      .duration(800)
      .ease(d3.easeCubicOut)
      .attr('y2', innerH);
    nowLine.append('animate')
      .attr('attributeName', 'opacity')
      .attr('values', '1;0.6;1')
      .attr('dur', '3s')
      .attr('repeatCount', 'indefinite');
    // a small downward triangle above the now line as an arrowhead
    g.append('path')
      .attr('class', 'now-arrow')
      .attr('d', `M ${x(age) - 4} -2 L ${x(age) + 4} -2 L ${x(age)} 4 Z`)
      .attr('fill', '#f4f1ea')
      .attr('opacity', 0);
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
    g.select('path.now-arrow').transition().delay(1500).duration(500).attr('opacity', 0.9);

    // Focus line container — pre-create the line + labels ONCE here so
    // the light effect can re-position them without removing/appending
    // nodes on every scrubber move. The previous implementation called
    // focusGroup.selectAll('*').remove() + append on every focusAge
    // change, which on iOS WebKit churns SMIL <animate> nodes fast
    // enough to crash the page (rapid back-and-forth scrubbing
    // produced an "Application error" full-screen).
    const focusGroup = g.append('g').attr('class', 'focus-group').attr('opacity', 0);
    const focusLine = focusGroup.append('line')
      .attr('class', 'focus-line')
      .attr('y1', 0).attr('y2', innerH)
      .attr('stroke', '#8b3a3a').attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4 3');
    focusLine.append('animate')
      .attr('attributeName', 'opacity')
      .attr('values', '1;0.55;1')
      .attr('dur', '2s')
      .attr('repeatCount', 'indefinite');
    focusGroup.append('text')
      .attr('class', 'focus-age')
      .attr('y', innerH + 56)
      .attr('text-anchor', 'middle')
      .attr('fill', '#8b3a3a')
      .attr('font-size', 11)
      .attr('font-weight', '500');
    focusGroup.append('text')
      .attr('class', 'focus-date')
      .attr('y', innerH + 70)
      .attr('text-anchor', 'middle')
      .attr('fill', '#8b3a3a')
      .attr('opacity', 0.7)
      .attr('font-size', 9);
    return () => {
      d3.select(ref.current).selectAll('*').remove();
    };
    // Deliberately ONLY depend on birthIso + maxAge. selected/onSelect are read
    // via refs so we don't tear down the entire chart on every interaction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [birthIso, maxAge]);

  // === Light effect: update only focus-driven visuals when focusAge or selected changes. ===
  //
  // rAF-coalesce the DOM mutations: a fast scrub or the 30 fps auto-play
  // animation can fire setFocusAge dozens of times per second, and a
  // straight effect would walk ~80 SVG nodes (arcs + stations + chapter
  // bands + focus marker) per state change. On iOS WebKit that pressure
  // is what causes the "Application error" full-screen crash during
  // rapid back-and-forth scrubbing.
  //
  // We pin the latest desired focus value in a ref, schedule one rAF
  // callback per frame at most, and do all the D3 work there. Multiple
  // state changes within a single frame collapse to a single DOM pass.
  const pendingRef = useRef<{ focusAge: number | null; selected: ArcSelection | null }>({
    focusAge: focusAge ?? null,
    selected: selected ?? null,
  });
  pendingRef.current = { focusAge: focusAge ?? null, selected: selected ?? null };
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (rafRef.current !== null) return; // already scheduled for this frame
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const svg = d3.select(ref.current);
      if (svg.empty()) return;
      const g = svg.select<SVGGElement>('g');
      if (g.empty()) return;

      const { focusAge: fa, selected: sel } = pendingRef.current;
      const age = ageInYears(birthIso);
      const focus = fa ?? age;

      function isActiveArc(d: Arc): boolean {
        return focus >= d.ageStart && focus < d.ageEnd;
      }
      function opacityFor(d: Arc): number {
        const isSel = sel && sel.cycleKey === d.cycleKey && sel.nthCycle === d.nthCycle;
        if (sel && !isSel) return 0.18;
        if (isActiveArc(d)) return 0.95;
        return 0.5;
      }
      function widthFor(d: Arc): number {
        const isSel = sel && sel.cycleKey === d.cycleKey && sel.nthCycle === d.nthCycle;
        if (isSel) return 2;
        if (isActiveArc(d)) return 1.3;
        return 0.7;
      }

      // Arc opacity + stroke-width based on focus + selection. Use D3's
      // function-valued attr() once instead of an .each() + per-node
      // d3.select() — one less wrapper allocation per node per frame.
      g.selectAll<SVGPathElement, Arc>('path.arc')
        .attr('opacity', opacityFor)
        .attr('stroke-width', widthFor);

      // Station diamonds.
      g.selectAll<SVGRectElement, typeof LIFE_STATIONS[number]>('rect.station')
        .attr('fill', (s) => Math.abs(focus - s.age) < 2 ? '#8b3a3a' : '#3a3a3a')
        .attr('opacity', (s) => Math.abs(focus - s.age) < 2 ? 0.95 : 0.7);

      // Chapter bands. Previously parsed data-start/data-end three times
      // per band per frame (once per .attr() call). Pre-compute via a
      // single .each() pass and stash in the node so the three attr
      // setters can read from a closure variable.
      g.selectAll<SVGLineElement, unknown>('line.chapter-band')
        .each(function () {
          const startAge = parseFloat(this.getAttribute('data-start') ?? '0');
          const endAge = parseFloat(this.getAttribute('data-end') ?? '0');
          const active = focus >= startAge && focus < endAge;
          this.setAttribute('stroke', active ? '#8b3a3a' : '#3a3a3a');
          this.setAttribute('stroke-width', active ? '2' : '0.8');
          this.setAttribute('opacity', active ? '0.95' : '0.5');
        });

      // Chapter label.
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

      // Focus marker. Toggle visibility + update positions on the
      // pre-created elements only.
      const focusGroup = g.select<SVGGElement>('g.focus-group');
      const showFocus = fa !== null && Math.abs(fa - age) > 0.05;
      focusGroup.attr('opacity', showFocus ? 1 : 0).attr('pointer-events', showFocus ? null : 'none');
      if (showFocus) {
        const fx = x(focus);
        focusGroup.select('line.focus-line').attr('x1', fx).attr('x2', fx);
        focusGroup.select('text.focus-age').attr('x', fx).text(`age ${focus.toFixed(1)}`);
        const birthMs = new Date(birthIso).getTime();
        const focusDate = new Date(birthMs + focus * 365.2425 * 86400 * 1000);
        const dateStr = focusDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
        focusGroup.select('text.focus-date').attr('x', fx).text(dateStr);
      }
    });
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusAge, selected, birthIso, maxAge]);

  return (
    <div className="relative">
      <svg ref={ref} viewBox="0 0 800 460" className="w-full" />
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
            <span className={`flex-1 min-w-0 ${selected?.cycleKey === c.key ? 'text-ink' : 'text-ink-dim'}`}>
              {c.label}
              {CYCLE_PLAIN_LABELS[c.key] && (
                <span className="serif italic text-ink-faint normal-case text-[9px] ml-1">
                  · {CYCLE_PLAIN_LABELS[c.key]}
                </span>
              )}
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
