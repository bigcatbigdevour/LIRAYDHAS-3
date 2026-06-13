/**
 * Tap-to-expand panel listing the chart's tightest natal aspects with a
 * one-line plain-language meaning for each. Pairs the wheel's coloured
 * lines with words so the user can see what they're looking at.
 *
 * No LLM call — uses the static aspectMeanings vocabulary. Ships
 * instantly, no rate limit, no cost, no Pro gate.
 */

'use client';

import PlanetGlyph from './PlanetGlyph';
import { computeNatalAspects, type NatalAspect } from '@/lib/astrology/natalAspects';
import { natalAspectMeaning } from '@/lib/astrology/aspectMeanings';
import type { Blueprint } from '@/lib/types';

const ASPECT_COLOR: Record<NatalAspect['kind'], string> = {
  conjunction: '#8b3a3a',
  sextile: '#3a7a52',
  square: '#8b3a3a',
  trine: '#3a7a52',
  opposition: '#666',
};

const ASPECT_GLYPH: Record<NatalAspect['kind'], string> = {
  conjunction: '☌',
  sextile: '⚹',
  square: '□',
  trine: '△',
  opposition: '☍',
};

interface Props {
  blueprint: Blueprint;
}

export default function NatalAspects({ blueprint }: Props) {
  const aspects = computeNatalAspects(blueprint, 6);
  if (aspects.length === 0) {
    return (
      <details className="mt-6 group">
        <summary className="small-label caps cursor-pointer text-ink-dim hover:text-ink list-none flex items-center gap-2">
          <span>Tightest aspects</span>
          <span className="text-ink-faint group-open:rotate-90 transition-transform">›</span>
        </summary>
        <p className="text-[12.5px] text-ink-faint italic mt-3">
          no aspects within standard orb — a calm wheel.
        </p>
      </details>
    );
  }
  return (
    <details className="mt-6 group">
      <summary className="small-label caps cursor-pointer text-ink-dim hover:text-ink list-none flex items-center gap-2">
        <span>Tightest aspects</span>
        <span className="text-ink-faint text-[10px]">({aspects.length})</span>
        <span className="text-ink-faint group-open:rotate-90 transition-transform">›</span>
      </summary>
      <p
        className="small-label caps text-ink-faint text-[10px] mt-3 mb-3"
        style={{ letterSpacing: '0.14em' }}
      >
        the loudest geometric relationships inside your chart, ordered by tightness
      </p>
      <ul className="space-y-3">
        {aspects.map((asp, i) => {
          const meaning = natalAspectMeaning(asp.a, asp.b, asp.kind);
          return (
            <li
              key={i}
              className="border-l-2 pl-3 py-1"
              style={{ borderLeftColor: ASPECT_COLOR[asp.kind] }}
            >
              <div className="flex items-baseline gap-1.5 mb-1">
                <PlanetGlyph name={asp.a} size={13} className="text-ink" />
                <span
                  className="text-ink-faint text-[12px]"
                  style={{ color: ASPECT_COLOR[asp.kind] }}
                  aria-hidden
                >
                  {ASPECT_GLYPH[asp.kind]}
                </span>
                <PlanetGlyph name={asp.b} size={13} className="text-ink" />
                <span
                  className="small-label caps text-ink-faint text-[10px] ml-1"
                  style={{ letterSpacing: '0.14em' }}
                >
                  {asp.a} {asp.kind} {asp.b}
                </span>
                <span className="tabular-nums text-ink-faint text-[10px] ml-auto">
                  {asp.orb.toFixed(1)}°
                </span>
              </div>
              <p className="serif text-[13px] text-ink-dim leading-relaxed">
                {meaning}
              </p>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
