'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { saveDay, isSaved, listSavedDays } from '@/lib/savedDays';
import { tap as hapticTap } from '@/lib/haptics';

interface Props {
  /** ISO date (YYYY-MM-DD) — typically today on /today. */
  dateIso: string;
}

/**
 * Quick-capture journal note on /today. Opens an inline textarea below
 * the daily question; saves a note for today without requiring the user
 * to first ☆ save the LLM reading.
 *
 * Plays nicely with SaveDayButton via the saveDay() merge: if the user
 * has already saved today's reading, this just attaches/updates the note;
 * if not, this creates a pure-journal entry (paragraph stays empty).
 */
export default function QuickNote({ dateIso }: Props) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [hasNote, setHasNote] = useState(false);
  const ref = useRef<HTMLTextAreaElement | null>(null);

  function refresh() {
    if (!isSaved(dateIso)) {
      setHasNote(false);
      return;
    }
    const me = listSavedDays().find((d) => d.dateIso === dateIso);
    setHasNote(!!me?.note);
  }

  useEffect(() => {
    setMounted(true);
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === 'liraydhas.savedDays.v1') refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateIso]);

  useEffect(() => {
    if (open && ref.current) ref.current.focus();
  }, [open]);

  if (!mounted) return null;

  // If today already has a note, the SaveDayButton above the page already
  // surfaces it inline. We don't duplicate that here — just point the
  // user back to it.
  if (hasNote) {
    return (
      <p
        className="small-label caps text-ink-faint mt-3 text-[10px]"
        style={{ letterSpacing: '0.14em' }}
      >
        ✓ today is noted ·{' '}
        <Link href="/saved" className="underline hover:text-ink">
          open journal →
        </Link>
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          hapticTap('light');
          setOpen(true);
        }}
        className="small-label caps text-ink-faint hover:text-ink mt-3"
        style={{ letterSpacing: '0.16em' }}
      >
        + write a note for today
      </button>
    );
  }

  return (
    <div className="mt-3 border-l-2 border-accent pl-3 py-1 fade-in max-w-md">
      <p
        className="small-label caps text-accent mb-1.5"
        style={{ letterSpacing: '0.14em' }}
      >
        today's note
      </p>
      <textarea
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.currentTarget.value)}
        rows={3}
        placeholder="what's happening — a memory, a context, something to remember"
        className="w-full bg-bg border border-hairline p-2 text-[13.5px] text-ink serif leading-relaxed"
        style={{ resize: 'vertical' }}
      />
      <div className="flex flex-wrap gap-3 mt-2 items-center">
        <button
          type="button"
          onClick={() => {
            if (!draft.trim()) return;
            hapticTap('medium');
            // Merge-aware save: if today's reading is already saved, this
            // attaches the note; otherwise creates a pure-journal entry.
            saveDay({
              dateIso,
              paragraph: '',
              note: draft.trim(),
              savedAt: Date.now(),
            });
            setOpen(false);
            setDraft('');
            refresh();
          }}
          disabled={!draft.trim()}
          className="btn-ghost"
        >
          save
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setDraft('');
          }}
          className="small-label caps text-ink-faint hover:text-ink"
          aria-label="cancel"
        >
          cancel
        </button>
      </div>
    </div>
  );
}
