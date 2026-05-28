// Deterministic short text summary of a Blueprint. Always available
// (no LLM required) — used as a fallback / shareable snippet on /chart.

import type { Blueprint } from './types';
import { profileName } from './humandesign/interpretations';

export function chartGlanceText(bp: Blueprint): string {
  const hd = bp.humanDesign;
  const n = bp.natal;
  const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  const ascSign = n.asc !== null ? SIGNS[Math.floor(((n.asc % 360) + 360) % 360 / 30)] : null;
  const centers = hd.definedCenters.length === 0
    ? 'no defined centers'
    : hd.definedCenters.map((c) => c === 'SolarPlexus' ? 'Solar Plexus' : c).join(', ');
  const channels = hd.activeChannels.map(([a, b]) => `${a}-${b}`).join(', ') || 'none';

  const lines: string[] = [
    `${n.sun.sign} ${n.sun.degree.toFixed(0)}° · Moon in ${n.moon.sign}${ascSign ? ` · ${ascSign} rising` : ''}`,
    `${hd.type} · ${hd.profile} (${profileName(hd.profile)}) · ${hd.authority} authority · ${hd.definition} definition`,
    `Centers: ${centers}`,
    `Channels: ${channels}`,
    `Cross: ${hd.incarnationCross}`,
  ];
  return lines.join('\n');
}
