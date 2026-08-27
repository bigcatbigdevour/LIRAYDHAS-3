/**
 * Split text into segments marked as "hit" (matches a query term) or
 * "miss". Used by /saved to wrap matched substrings in <mark> so the
 * eye finds the term inside long paragraphs.
 *
 * Case-insensitive. Multiple query terms each match independently. The
 * output preserves the original casing; only the boundaries shift.
 *
 * Avoids regex special-character traps by escaping query terms before
 * building the search regex.
 */

export interface Segment {
  text: string;
  hit: boolean;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function highlightSegments(text: string, query: string): Segment[] {
  const q = query.trim();
  if (!q || !text) return [{ text, hit: false }];
  const terms = q
    .split(/\s+/)
    .map((t) => t.toLowerCase())
    .filter((t) => t.length > 0);
  if (terms.length === 0) return [{ text, hit: false }];

  // Build a single regex of all terms, alternation, case-insensitive.
  const re = new RegExp(`(${terms.map(escapeRegex).join('|')})`, 'gi');
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ text: text.slice(last, i), hit: false });
    out.push({ text: m[0], hit: true });
    last = i + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), hit: false });
  return out;
}
