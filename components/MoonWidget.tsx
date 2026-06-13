'use client';

import { useState } from 'react';
import MoonIcon from './MoonIcon';
import { tap as hapticTap } from '@/lib/haptics';
import type { UpcomingLunation } from '@/lib/astrology/moon';

interface Props {
  /** From currentMoon() — phase degrees + name + sign. */
  moon: { phaseDegrees: number; name: string; moonSign: string };
  /** Optional countdown to the next major lunation. */
  lunation?: UpcomingLunation | null;
  /** Optional countdown to next sign change. */
  shift?: { hours: number; nextSign: string } | null;
}

/**
 * Header moon widget for /today. Tap to expand a small explainer panel:
 *   · the moon's current phase + sign
 *   · what this phase tends to feel like
 *   · the countdown to the next major lunation (new / first quarter /
 *     full / last quarter)
 *   · when the moon shifts to the next sign, if within ~18h
 *
 * The header span is unchanged when collapsed — same MoonIcon at 16px,
 * same caps label. Tap and the explainer drops down underneath in a
 * fade-in panel.
 */
const PHASE_TEXTURES: Record<string, string> = {
  'New Moon':         'beginnings, intentions, the dark — what you plant now grows in the next four weeks',
  'Waxing Crescent':  'momentum gathering, the first sliver, the work of starting',
  'First Quarter':    'pressure point, decision required, friction shows what\'s built right',
  'Waxing Gibbous':   'almost-full energy, refining, the last tightening before the peak',
  'Full Moon':        'culmination, full visibility, what\'s been growing reaches the air',
  'Waning Gibbous':   'release after fullness, gratitude, the harvest is in',
  'Last Quarter':     'evaluation, release the rest, the slow exhale',
  'Waning Crescent':  'rest, integration, the dark again — the cycle closing',
};

export default function MoonWidget({ moon, lunation, shift }: Props) {
  const [open, setOpen] = useState(false);
  const texture = PHASE_TEXTURES[moon.name];

  return (
    <>
      <button
        type="button"
        onClick={() => { hapticTap('light'); setOpen((v) => !v); }}
        className="flex items-center gap-1.5 small-label caps text-ink hover:text-accent"
        aria-expanded={open}
        aria-label={`${moon.name.toLowerCase()} in ${moon.moonSign} — tap for details`}
      >
        <MoonIcon phase={moon.phaseDegrees} size={16} />
        <span>{moon.name.toLowerCase()} · {moon.moonSign}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 max-w-xs border border-hairline bg-bg p-3 fade-in z-30 shadow-lg">
          <div className="flex items-start gap-3">
            <MoonIcon phase={moon.phaseDegrees} size={28} />
            <div className="flex-1">
              <p
                className="small-label caps text-accent text-[10px]"
                style={{ letterSpacing: '0.18em' }}
              >
                {moon.name.toLowerCase()} · in {moon.moonSign.toLowerCase()}
              </p>
              {texture && (
                <p className="serif text-[13px] text-ink-dim mt-1 leading-relaxed">
                  {texture}
                </p>
              )}
            </div>
          </div>

          {(lunation || shift) && (
            <div className="mt-2.5 pt-2.5 border-t border-hairline space-y-1">
              {lunation && lunation.daysUntil < 8 && (
                <p
                  className="small-label caps text-ink-faint text-[10px]"
                  style={{ letterSpacing: '0.16em' }}
                >
                  next · {lunation.phase} moon in{' '}
                  <span className="text-ink-dim">
                    {Math.max(1, Math.round(lunation.daysUntil))}d
                  </span>
                </p>
              )}
              {shift && shift.hours < 18 && (
                <p
                  className="small-label caps text-ink-faint text-[10px]"
                  style={{ letterSpacing: '0.16em' }}
                >
                  moves into <span className="text-ink-dim">{shift.nextSign.toLowerCase()}</span> in{' '}
                  {Math.max(1, Math.round(shift.hours))}h
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="small-label caps text-ink-faint hover:text-ink mt-3 text-[10px]"
            style={{ letterSpacing: '0.18em' }}
          >
            close
          </button>
        </div>
      )}
    </>
  );
}
