import { NextResponse } from 'next/server';
import { CYCLES, upcomingReturns } from '@/lib/cycles';
import type { Blueprint } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
function icsDate(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

/** All future polarity flips for the next `years` years. */
function upcomingFlips(birthIso: string, years = 30): { cycleKey: string; cycleLabel: string; date: Date; toRising: boolean; description: string }[] {
  const birth = new Date(birthIso);
  const now = new Date();
  const horizon = new Date(now.getTime() + years * 365.2425 * 86400 * 1000);
  const out: { cycleKey: string; cycleLabel: string; date: Date; toRising: boolean; description: string }[] = [];
  for (const c of CYCLES) {
    const halfLen = c.yearLength / 2;
    // start from age 0 every half-period
    for (let k = 1; k * halfLen * 365.2425 * 86400 * 1000 + birth.getTime() < horizon.getTime(); k++) {
      const t = new Date(birth.getTime() + k * halfLen * 365.2425 * 86400 * 1000);
      if (t.getTime() < now.getTime()) continue;
      const toRising = k % 2 === 0; // even half-index starts rising
      out.push({
        cycleKey: c.key,
        cycleLabel: c.label,
        date: t,
        toRising,
        description: c.description,
      });
    }
  }
  out.sort((a, b) => a.date.getTime() - b.date.getTime());
  return out;
}

export async function POST(req: Request) {
  let body: { blueprint?: Blueprint; include?: string[] };
  try {
    body = (await req.json()) as { blueprint?: Blueprint; include?: string[] };
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const bp = body.blueprint;
  if (!bp) return NextResponse.json({ error: 'missing blueprint' }, { status: 400 });

  const include = new Set(body.include ?? ['returns', 'flips']);

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Liraydhas//Cycles//EN',
    'CALSCALE:GREGORIAN',
  ];

  if (include.has('returns')) {
    const returns = upcomingReturns(bp.birth.iso);
    for (const e of returns) {
      const dt = icsDate(e.date);
      const end = new Date(e.date.getTime() + 86400 * 1000);
      lines.push(
        'BEGIN:VEVENT',
        `UID:return-${e.cycle.key}-${dt}@liraydhas`,
        `DTSTAMP:${icsDate(new Date())}T000000Z`,
        `DTSTART;VALUE=DATE:${dt}`,
        `DTEND;VALUE=DATE:${icsDate(end)}`,
        `SUMMARY:${e.cycle.label}`,
        `DESCRIPTION:${e.cycle.description}`,
        'END:VEVENT',
      );
    }
  }

  if (include.has('flips')) {
    const flips = upcomingFlips(bp.birth.iso);
    for (const f of flips) {
      const dt = icsDate(f.date);
      const end = new Date(f.date.getTime() + 86400 * 1000);
      lines.push(
        'BEGIN:VEVENT',
        `UID:flip-${f.cycleKey}-${dt}@liraydhas`,
        `DTSTAMP:${icsDate(new Date())}T000000Z`,
        `DTSTART;VALUE=DATE:${dt}`,
        `DTEND;VALUE=DATE:${icsDate(end)}`,
        `SUMMARY:${f.cycleLabel} flips → ${f.toRising ? 'rising' : 'descending'}`,
        `DESCRIPTION:${f.description}`,
        'END:VEVENT',
      );
    }
  }

  lines.push('END:VCALENDAR');
  const ics = lines.join('\r\n');

  return new NextResponse(ics, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': 'attachment; filename="liraydhas-cycles.ics"',
    },
  });
}
