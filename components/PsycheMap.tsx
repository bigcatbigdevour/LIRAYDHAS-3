'use client';

import { useMemo } from 'react';
import type { PsycheEntry } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  entries: PsycheEntry[];
}

interface LaidOutNode {
  id: string;
  label: string;
  weight: number;
  kind: 'theme' | 'contradiction' | 'resistance';
  x: number;
  y: number;
}

export default function PsycheMap({ open, onClose, entries }: Props) {
  const { nodes, edges, stats } = useMemo(() => buildGraph(entries), [entries]);

  const avgCertainty =
    entries.length === 0
      ? 0
      : entries.reduce((s, e) => s + e.certaintyScore, 0) / entries.length;

  return (
    <aside className={`psyche-panel ${open ? 'open' : ''}`} aria-hidden={!open}>
      <div className="psyche-head">
        <div className="psyche-title">Psyche Map</div>
        <button className="psyche-close" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="psyche-sub">
        {entries.length === 0
          ? 'the map is still.'
          : 'what has been named, what resists being named.'}
      </div>

      <div className="psyche-canvas">
        {nodes.length === 0 ? (
          <div className="psyche-empty">
            Answer a question. Your mind will begin to show.
          </div>
        ) : (
          <GraphSvg nodes={nodes} edges={edges} />
        )}
      </div>

      <div className="psyche-meta">
        <div className="psyche-meta-row">
          <span className="psyche-meta-key">Questions</span>
          <span className="psyche-meta-val">{entries.length}</span>
        </div>
        <div className="psyche-meta-row">
          <span className="psyche-meta-key">Avg certainty</span>
          <span className="psyche-meta-val">
            {(avgCertainty * 100).toFixed(0)}%
          </span>
        </div>
        <div className="psyche-meta-row">
          <span className="psyche-meta-key">Themes</span>
          <span className="psyche-meta-val">{stats.themeCount}</span>
        </div>
        {stats.topResistance.length > 0 && (
          <div className="psyche-meta-row">
            <span className="psyche-meta-key">Resistance</span>
            <ul className="psyche-list">
              {stats.topResistance.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}
        {stats.topContradictions.length > 0 && (
          <div className="psyche-meta-row">
            <span className="psyche-meta-key">Tensions</span>
            <ul className="psyche-list">
              {stats.topContradictions.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
}

function GraphSvg({
  nodes,
  edges,
}: {
  nodes: LaidOutNode[];
  edges: { from: string; to: string; weight: number }[];
}) {
  const width = 380;
  const height = 380;
  const nodeIndex = new Map(nodes.map((n) => [n.id, n]));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Edges first so they sit under nodes. */}
      {edges.map((e, i) => {
        const a = nodeIndex.get(e.from);
        const b = nodeIndex.get(e.to);
        if (!a || !b) return null;
        return (
          <line
            key={`e${i}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="#1f3a8a"
            strokeOpacity={Math.min(0.12 + e.weight * 0.14, 0.6)}
            strokeWidth={0.6 + e.weight * 0.5}
          />
        );
      })}
      {nodes.map((n) => {
        const r = 4 + Math.min(n.weight, 5) * 2.6;
        const isTheme = n.kind === 'theme';
        return (
          <g key={n.id}>
            <circle
              cx={n.x}
              cy={n.y}
              r={r}
              fill={isTheme ? '#1f3a8a' : '#ffffff'}
              stroke="#1f3a8a"
              strokeWidth={isTheme ? 0 : 1}
              opacity={n.kind === 'resistance' ? 0.55 : 0.9}
            />
            <text
              x={n.x}
              y={n.y + r + 11}
              fontSize={9.5}
              textAnchor="middle"
              fill="#1a1a1a"
              fontFamily="'Cormorant Garamond', serif"
              fontStyle={n.kind === 'theme' ? 'normal' : 'italic'}
              opacity={0.85}
            >
              {n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------- graph construction ----------

function buildGraph(entries: PsycheEntry[]) {
  const themeCount = new Map<string, number>();
  const contradictionCount = new Map<string, number>();
  const resistanceCount = new Map<string, number>();
  const pairCount = new Map<string, number>(); // "a|b" alphabetical

  for (const e of entries) {
    const themes = dedupe(e.themes);
    for (const t of themes) themeCount.set(t, (themeCount.get(t) ?? 0) + 1);
    for (const c of dedupe(e.contradictions))
      contradictionCount.set(c, (contradictionCount.get(c) ?? 0) + 1);
    for (const r of dedupe(e.resistance))
      resistanceCount.set(r, (resistanceCount.get(r) ?? 0) + 1);

    for (let i = 0; i < themes.length; i++) {
      for (let j = i + 1; j < themes.length; j++) {
        const a = themes[i];
        const b = themes[j];
        const key = a < b ? `${a}|${b}` : `${b}|${a}`;
        pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
      }
    }
  }

  // Take the top themes and a few contradictions/resistance patterns.
  const topThemes = sortedByCount(themeCount).slice(0, 9);
  const topContradictions = sortedByCount(contradictionCount).slice(0, 3);
  const topResistance = sortedByCount(resistanceCount).slice(0, 3);

  const centerX = 190;
  const centerY = 190;
  const nodes: LaidOutNode[] = [];

  // Themes laid out on a ring — newer themes orbit inward slightly.
  const ringR = 115;
  topThemes.forEach(([label, weight], i) => {
    const a = (2 * Math.PI * i) / Math.max(topThemes.length, 1) - Math.PI / 2;
    const r = ringR - Math.min(i, 4) * 6;
    nodes.push({
      id: `t:${label}`,
      label,
      weight,
      kind: 'theme',
      x: centerX + Math.cos(a) * r,
      y: centerY + Math.sin(a) * r,
    });
  });

  // Contradictions — inner smaller ring.
  const innerR = 55;
  topContradictions.forEach(([label, weight], i) => {
    const a = (2 * Math.PI * i) / Math.max(topContradictions.length, 1);
    nodes.push({
      id: `c:${label}`,
      label,
      weight,
      kind: 'contradiction',
      x: centerX + Math.cos(a) * innerR,
      y: centerY + Math.sin(a) * innerR,
    });
  });

  // Resistance — outer ring.
  const outerR = 160;
  topResistance.forEach(([label, weight], i) => {
    const a = (2 * Math.PI * i) / Math.max(topResistance.length, 1) + 0.4;
    nodes.push({
      id: `r:${label}`,
      label,
      weight,
      kind: 'resistance',
      x: centerX + Math.cos(a) * outerR,
      y: centerY + Math.sin(a) * outerR,
    });
  });

  // Edges between co-occurring themes.
  const themeIds = new Set(topThemes.map(([l]) => `t:${l}`));
  const edges: { from: string; to: string; weight: number }[] = [];
  for (const [key, weight] of pairCount.entries()) {
    const [a, b] = key.split('|');
    const idA = `t:${a}`;
    const idB = `t:${b}`;
    if (themeIds.has(idA) && themeIds.has(idB)) {
      edges.push({ from: idA, to: idB, weight });
    }
  }

  const stats = {
    themeCount: themeCount.size,
    topContradictions: topContradictions.map(([l]) => l),
    topResistance: topResistance.map(([l]) => l),
  };

  return { nodes, edges, stats };
}

function dedupe(arr: string[]): string[] {
  return Array.from(new Set(arr.map((s) => s.trim().toLowerCase())));
}

function sortedByCount(m: Map<string, number>): Array<[string, number]> {
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
}
