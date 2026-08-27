'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { saveDay, isSaved, listSavedDays, appendMoment } from '@/lib/savedDays';
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

  // If today already has a note, offer a clean "+ another moment" path
  // that appends a timestamped block to it, instead of duplicating the
  // entry. The SaveDayButton above the page renders the existing note;
  // this lets the user add to it without scrolling back up.
  if (hasNote && !open) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            hapticTap('light');
            setOpen(true);
          }}
          className="small-label caps text-ink-faint hover:text-ink"
          style={{ letterSpacing: '0.16em' }}
          aria-label="add another moment to today"
        >
          + another moment
        </button>
        <Link
          href="/saved"
          className="small-label caps text-ink-faint hover:text-ink text-[10px]"
          style={{ letterSpacing: '0.16em' }}
        >
          open journal →
        </Link>
      </div>
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
        {hasNote ? 'another moment' : "today's note"}
      </p>
      <textarea
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.currentTarget.value)}
        rows={3}
        placeholder={
          hasNote
            ? 'what changed since you last wrote — appended with a timestamp'
            : "what's happening — a memory, a context, something to remember"
        }
        className="w-full bg-bg border border-hairline p-2 text-[13.5px] text-ink serif leading-relaxed"
        style={{ resize: 'vertical' }}
      />
      <div className="flex flex-wrap gap-3 mt-2 items-center">
        <button
          type="button"
          onClick={() => {
            if (!draft.trim()) return;
            hapticTap('medium');
            if (hasNote) {
              // Existing note → append a timestamped block so the day's
              // chronology stays legible. Multi-moment journaling in
              // place, no schema migration needed.
              appendMoment(dateIso, draft.trim());
            } else {
              // First write of the day → create the entry. Merge-aware,
              // so this still attaches the note even if SaveDayButton
              // already saved the reading first.
              saveDay({
                dateIso,
                paragraph: '',
                note: draft.trim(),
                savedAt: Date.now(),
              });
            }
            setOpen(false);
            setDraft('');
            refresh();
          }}
          disabled={!draft.trim()}
          className="btn-ghost"
        >
          {hasNote ? 'add moment' : 'save'}
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
