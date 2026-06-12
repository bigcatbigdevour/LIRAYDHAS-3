'use client';

import Link from 'next/link';
import { tap as hapticTap } from '@/lib/haptics';

interface Props {
  /** One-line description of what this is. Voice-matched. */
  label: string;
  /** Short caption underneath, e.g. "Pro · subscribe to unlock". */
  caption?: string;
}

/**
 * Tiny inline "this is Pro" affordance — used as the ProGate fallback
 * in contexts where slamming a full Paywall would be visually heavy
 * (e.g. the "+ ask the day" link on /today, or the photo strip under a
 * journal entry). Tap routes to /pro.
 */
export default function UpgradeNudge({ label, caption = 'Pro · subscribe to unlock' }: Props) {
  return (
    <Link
      href="/pro"
      onClick={() => hapticTap('light')}
      className="block border-l-2 border-accent pl-3 py-1.5 mt-3 hover:bg-accent/5 transition-colors"
    >
      <p
        className="small-label caps text-accent"
        style={{ letterSpacing: '0.18em' }}
      >
        ◆ {label}
      </p>
      <p
        className="small-label caps text-ink-faint text-[10px] mt-0.5"
        style={{ letterSpacing: '0.14em' }}
      >
        {caption}
      </p>
    </Link>
  );
}
