'use client';

import { useEffect } from 'react';
import type { SavedDay } from '@/lib/savedDays';
import { tap as hapticTap } from '@/lib/haptics';

interface Props {
  day: SavedDay;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

/**
 * A full-screen reader for a single saved-day entry. Strips every piece
 * of UI chrome — no tab bar, no scroll hints, no action buttons crowding
 * the page — so the entry can be read like a page of a book.
 *
 * Mounted as a sibling overlay above the /saved page. Closes on ESC,
 * pulls focus on mount, prev/next via arrow keys.
 */
export default function EntryReadMode({
  day,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: Props) {
  // Keyboard: ESC closes, arrows navigate. Locks body scroll so the page
  // behind doesn't scroll under the reader.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && hasPrev && onPrev) {
        onPrev();
      } else if (e.key === 'ArrowRight' && hasNext && onNext) {
        onNext();
      }
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  const date = new Date(day.dateIso + 'T12:00:00');
  const dateLong = date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="entry reader"
      className="fixed inset-0 z-[60] bg-bg fade-in overflow-y-auto"
      style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
    >
      <div className="grain pointer-events-none" aria-hidden />
      {/* Top bar: close + step controls. Generous tap targets. */}
      <div
        className="sticky top-0 z-10 bg-bg/95 backdrop-blur-sm border-b border-hairline"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => { hapticTap('light'); onClose(); }}
            className="small-label caps text-ink-faint hover:text-ink"
            style={{ letterSpacing: '0.18em' }}
            aria-label="close reader"
          >
            × close
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => { if (hasPrev && onPrev) { hapticTap('light'); onPrev(); } }}
              disabled={!hasPrev}
              className={`small-label caps ${hasPrev ? 'text-ink-faint hover:text-ink' : 'text-ink-faint opacity-30 cursor-not-allowed'}`}
              style={{ letterSpacing: '0.18em' }}
              aria-label="previous entry"
            >
              ← prev
            </button>
            <button
              type="button"
              onClick={() => { if (hasNext && onNext) { hapticTap('light'); onNext(); } }}
              disabled={!hasNext}
              className={`small-label caps ${hasNext ? 'text-ink-faint hover:text-ink' : 'text-ink-faint opacity-30 cursor-not-allowed'}`}
              style={{ letterSpacing: '0.18em' }}
              aria-label="next entry"
            >
              next →
            </button>
          </div>
        </div>
      </div>

      {/* Body: deliberate widow-friendly typography. Wider line length
          than the journal list, larger serif, calm vertical rhythm. */}
      <article className="max-w-xl mx-auto px-6 py-12">
        <header className="mb-10">
          <p
            className="small-label caps text-accent"
            style={{ letterSpacing: '0.22em' }}
          >
            {day.pinned ? '◆ pinned · ' : ''}entry
          </p>
          <h1
            className="serif text-ink mt-3"
            style={{ fontSize: 'clamp(1.6rem, 6vw, 2.2rem)', lineHeight: 1.2 }}
          >
            {dateLong.toLowerCase()}
          </h1>
          {day.headline && (
            <p
              className="small-label caps text-ink-faint mt-2"
              style={{ letterSpacing: '0.14em' }}
            >
              {day.headline}
            </p>
          )}
          {day.snapshot && (day.snapshot.moonPhase || day.snapshot.chapter || day.snapshot.ageYears != null) && (
            <p
              className="small-label caps text-ink-faint mt-1 text-[10px]"
              style={{ letterSpacing: '0.16em' }}
            >
              {day.snapshot.ageYears != null && <>age {day.snapshot.ageYears.toFixed(1)} · </>}
              {day.snapshot.moonPhase}
              {day.snapshot.moonSign && <> · moon in {day.snapshot.moonSign.toLowerCase()}</>}
              {day.snapshot.chapter && <> · {day.snapshot.chapter.toLowerCase()}</>}
            </p>
          )}
          {day.tags && day.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {day.tags.map((t) => (
                <span
                  key={t}
                  className="small-label caps text-[10px] px-1.5 py-0.5 border border-accent text-accent"
                  style={{ letterSpacing: '0.16em' }}
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </header>

        {day.paragraph && (
          <p
            className="serif text-ink"
            style={{ fontSize: 'clamp(1.05rem, 3.8vw, 1.15rem)', lineHeight: 1.7 }}
          >
            {day.paragraph}
          </p>
        )}

        {day.note && (
          <div className="mt-10 border-l-2 border-accent pl-4 py-2">
            <p
              className="small-label caps text-accent mb-2"
              style={{ letterSpacing: '0.18em' }}
            >
              {day.paragraph ? 'your note' : 'journal'}
            </p>
            <p
              className="serif text-ink whitespace-pre-wrap"
              style={{ fontSize: 'clamp(1rem, 3.6vw, 1.1rem)', lineHeight: 1.7 }}
            >
              {day.note}
            </p>
          </div>
        )}

        {!day.paragraph && !day.note && (
          <p className="serif italic text-ink-faint text-[14px]">
            (empty entry)
          </p>
        )}

        <footer className="mt-16 pt-6 border-t border-hairline">
          <p
            className="small-label caps text-ink-faint text-[10px]"
            style={{ letterSpacing: '0.16em' }}
          >
            saved {new Date(day.savedAt).toLocaleDateString(undefined, {
              year: 'numeric', month: 'long', day: 'numeric',
            }).toLowerCase()}
          </p>
        </footer>
      </article>
    </div>
  );
}
