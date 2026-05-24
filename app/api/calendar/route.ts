import { NextResponse } from 'next/server';
import { upcomingReturns } from '@/lib/cycles';
import type { Blueprint } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
function icsDate(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

export async function POST(req: Request) {
  let body: { blueprint?: Blueprint };
  try {
    body = (await req.json()) as { blueprint?: Blueprint };
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const bp = body.blueprint;
  if (!bp) return NextResponse.json({ error: 'missing blueprint' }, { status: 400 });

  const events = upcomingReturns(bp.birth.iso);
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Liraydhas//Returns//EN',
    'CALSCALE:GREGORIAN',
  ];
  for (const e of events) {
    const dt = icsDate(e.date);
    // Add a day for DTEND (ICS treats end-date as exclusive).
    const end = new Date(e.date.getTime() + 86400 * 1000);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.cycle.key}-${dt}@liraydhas`,
      `DTSTAMP:${icsDate(new Date())}T000000Z`,
      `DTSTART;VALUE=DATE:${dt}`,
      `DTEND;VALUE=DATE:${icsDate(end)}`,
      `SUMMARY:${e.cycle.label}`,
      `DESCRIPTION:${e.cycle.description}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  const ics = lines.join('\r\n');

  return new NextResponse(ics, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': 'attachment; filename="liraydhas-returns.ics"',
    },
  });
}
