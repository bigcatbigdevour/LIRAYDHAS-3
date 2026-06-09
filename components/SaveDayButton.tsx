'use client';

import { useEffect, useState } from 'react';
import { isSaved, saveDay, unsaveDay } from '@/lib/savedDays';
import { tap as hapticTap } from '@/lib/haptics';

interface Props {
  /** ISO date (YYYY-MM-DD) for the reading. */
  dateIso: string;
  /** The paragraph being saved. */
  paragraph: string;
  /** Optional one-line headline like "Saturn square Sun · -0.4°". */
  headline?: string;
}

/**
 * Small bookmark toggle that sits next to share / refresh buttons on the
 * daily reading. Saving stores the day's reading locally so the user can
 * revisit it from /saved. SSR-safe via mounted gate.
 */
export default function SaveDayButton({ dateIso, paragraph, headline }: Props) {
  const [mounted, setMounted] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSaved(isSaved(dateIso));
  }, [dateIso]);

  if (!mounted) return null;

  const toggle = () => {
    hapticTap(saved ? 'light' : 'medium');
    if (saved) {
      unsaveDay(dateIso);
      setSaved(false);
    } else {
      saveDay({ dateIso, paragraph, headline, savedAt: Date.now() });
      setSaved(true);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="small-label caps text-ink-faint hover:text-ink flex items-center gap-1.5"
      aria-pressed={saved}
      aria-label={saved ? 'unsave this reading' : 'save this reading'}
      title={saved ? 'saved · tap to unsave' : 'save this reading'}
    >
      <span aria-hidden style={{ fontSize: 13, lineHeight: 1 }}>
        {saved ? '★' : '☆'}
      </span>
      <span>{saved ? 'saved' : 'save'}</span>
    </button>
  );
}
