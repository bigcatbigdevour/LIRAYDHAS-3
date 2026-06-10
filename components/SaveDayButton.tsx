'use client';

import { useEffect, useRef, useState } from 'react';
import { isSaved, saveDay, unsaveDay, updateNote, listSavedDays, type SavedDay } from '@/lib/savedDays';
import { tap as hapticTap } from '@/lib/haptics';

interface Props {
  /** ISO date (YYYY-MM-DD) for the reading. */
  dateIso: string;
  /** The paragraph being saved. */
  paragraph: string;
  /** Optional one-line headline like "Saturn square Sun · -0.4°". */
  headline?: string;
  /**
   * Optional snapshot of the day's other context (moon phase / sign,
   * life chapter, age). Stored alongside so future anniversaries can
   * compare then-vs-now without re-deriving.
   */
  snapshot?: SavedDay['snapshot'];
}

/**
 * Small bookmark toggle for the daily reading. Tapping save also opens
 * an inline note textarea — the user can write context right when they
 * have a reason, instead of saving and digging into /saved later.
 * Tapping again unsaves.
 *
 * SSR-safe via mounted gate.
 */
export default function SaveDayButton({ dateIso, paragraph, headline, snapshot }: Props) {
  const [mounted, setMounted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [existingNote, setExistingNote] = useState<string | undefined>(undefined);
  const [noteOpen, setNoteOpen] = useState(false);
  const [draftNote, setDraftNote] = useState('');
  // Reflection nudge: 5 minutes after the user commits a note, we surface
  // a small "what landed since you wrote this?" prompt. Once per save
  // event, per page life — never persisted across reloads.
  const [showReflection, setShowReflection] = useState(false);
  const reflectionTimer = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Refresh the saved/note state from storage. Called on mount and after
  // every save / unsave / note-commit so the inline preview stays accurate.
  function refresh() {
    setSaved(isSaved(dateIso));
    const list = listSavedDays();
    const me = list.find((d) => d.dateIso === dateIso);
    setExistingNote(me?.note);
  }

  useEffect(() => {
    setMounted(true);
    refresh();
    // Cross-tab sync: if the user saves / unsaves / edits a note in
    // another tab, this button reflects it immediately.
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === 'liraydhas.savedDays.v1') {
        refresh();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateIso]);

  // Auto-focus the textarea when the note panel opens — captures intent
  // while it's fresh. Without this, the user has to make an extra tap.
  useEffect(() => {
    if (noteOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [noteOpen]);

  // Schedule a reflection nudge `delayMs` from now. Cancels any pending
  // nudge first so a quick edit-save-edit-save sequence doesn't fire
  // multiple times.
  function scheduleReflection(delayMs: number = 5 * 60_000) {
    if (reflectionTimer.current !== null) {
      window.clearTimeout(reflectionTimer.current);
    }
    reflectionTimer.current = window.setTimeout(() => {
      setShowReflection(true);
      reflectionTimer.current = null;
    }, delayMs);
  }

  // Clean up any pending reflection on unmount.
  useEffect(() => {
    return () => {
      if (reflectionTimer.current !== null) {
        window.clearTimeout(reflectionTimer.current);
      }
    };
  }, []);

  if (!mounted) return null;

  const onSave = () => {
    hapticTap('medium');
    saveDay({
      dateIso,
      paragraph,
      headline,
      snapshot,
      savedAt: Date.now(),
    });
    refresh();
    setNoteOpen(true);
  };

  const onUnsave = () => {
    hapticTap('light');
    if (noteOpen && draftNote.trim() && !confirm('Discard your unsaved note and remove this day?')) return;
    unsaveDay(dateIso);
    setNoteOpen(false);
    setDraftNote('');
    refresh();
  };

  const onCommitNote = () => {
    hapticTap('medium');
    updateNote(dateIso, draftNote.trim());
    setNoteOpen(false);
    refresh();
    // Schedule a soft "what landed since you wrote this?" prompt for
    // five minutes from now. Captures reflection-after-the-fact, when
    // the day has had time to settle.
    scheduleReflection();
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={saved ? onUnsave : onSave}
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

      {/* Reflection nudge — surfaces 5min after a note commit. One-time
          per page-life; dismissed reflections don't return. Saves any
          added text as an APPENDED line to the existing note (so the
          original write isn't overwritten). */}
      {showReflection && existingNote && !noteOpen && (
        <ReflectionPrompt
          dateIso={dateIso}
          existingNote={existingNote}
          onDone={() => {
            setShowReflection(false);
            refresh();
          }}
        />
      )}

      {/* If already saved with a note and the editor isn't open, show
          the note quietly inline so the user can re-read what they
          wrote without leaving the page. */}
      {saved && existingNote && !noteOpen && (
        <div className="mt-3 border-l-2 border-accent pl-3 py-1 fade-in w-full max-w-md">
          <p
            className="small-label caps text-accent mb-1"
            style={{ letterSpacing: '0.12em' }}
          >
            your note
          </p>
          <p className="serif text-[13.5px] text-ink whitespace-pre-wrap leading-relaxed">
            {existingNote}
          </p>
          <button
            type="button"
            onClick={() => {
              hapticTap('light');
              setDraftNote(existingNote);
              setNoteOpen(true);
            }}
            className="small-label caps text-ink-faint hover:text-ink mt-2"
            style={{ letterSpacing: '0.14em' }}
          >
            edit note
          </button>
        </div>
      )}

      {/* Or, if saved with no note yet, offer to add one without re-saving. */}
      {saved && !existingNote && !noteOpen && (
        <button
          type="button"
          onClick={() => {
            hapticTap('light');
            setDraftNote('');
            setNoteOpen(true);
          }}
          className="small-label caps text-ink-faint hover:text-ink mt-3 inline-block"
          style={{ letterSpacing: '0.14em' }}
        >
          + add a note
        </button>
      )}

      {noteOpen && (
        <div className="mt-3 border-l-2 border-accent pl-3 py-1 fade-in w-full max-w-md">
          <p
            className="small-label caps text-accent mb-1.5"
            style={{ letterSpacing: '0.14em' }}
          >
            {existingNote ? 'edit your note' : 'want to add a note? you can come back to it'}
          </p>
          <textarea
            ref={textareaRef}
            value={draftNote}
            onChange={(e) => setDraftNote(e.currentTarget.value)}
            rows={2}
            placeholder="what's happening today — a memory, a context, something you want to remember"
            className="w-full bg-bg border border-hairline p-2 text-[13.5px] text-ink serif leading-relaxed"
            style={{ resize: 'vertical' }}
          />
          <div className="flex flex-wrap gap-3 mt-2 items-center">
            <button
              type="button"
              onClick={onCommitNote}
              className="btn-ghost"
              disabled={!draftNote.trim()}
            >
              save note
            </button>
            <button
              type="button"
              onClick={() => {
                setNoteOpen(false);
                setDraftNote('');
              }}
              className="small-label caps text-ink-faint hover:text-ink"
              aria-label={existingNote ? 'cancel editing' : 'skip adding a note'}
            >
              {existingNote ? 'cancel' : 'skip'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Soft reflection prompt that surfaces a few minutes after a note save.
 * "What landed since you wrote this?" The user can write a follow-up
 * (appended to the original note with a divider) or dismiss with skip.
 * Self-contained so the parent doesn't carry extra state.
 */
function ReflectionPrompt({
  dateIso,
  existingNote,
  onDone,
}: {
  dateIso: string;
  existingNote: string;
  onDone: () => void;
}) {
  const [draft, setDraft] = useState('');
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div className="mt-3 border-l-2 border-accent pl-3 py-1 fade-in w-full max-w-md">
      <p
        className="small-label caps text-accent mb-1.5"
        style={{ letterSpacing: '0.14em' }}
      >
        anything land since you wrote this?
      </p>
      <textarea
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.currentTarget.value)}
        rows={2}
        placeholder="a follow-up thought — appended to your note below"
        className="w-full bg-bg border border-hairline p-2 text-[13.5px] text-ink serif leading-relaxed"
        style={{ resize: 'vertical' }}
      />
      <div className="flex flex-wrap gap-3 mt-2 items-center">
        <button
          type="button"
          onClick={() => {
            if (!draft.trim()) {
              onDone();
              return;
            }
            hapticTap('medium');
            // Append with a dashed divider so the original note remains
            // legible as the original write, with the reflection clearly
            // dated below.
            const stamp = new Date().toLocaleTimeString(undefined, {
              hour: 'numeric', minute: '2-digit',
            });
            const appended = `${existingNote}\n\n— later (${stamp}) —\n${draft.trim()}`;
            updateNote(dateIso, appended);
            onDone();
          }}
          disabled={!draft.trim()}
          className="btn-ghost"
        >
          add to note
        </button>
        <button
          type="button"
          onClick={() => {
            onDone();
          }}
          className="small-label caps text-ink-faint hover:text-ink"
        >
          skip
        </button>
      </div>
    </div>
  );
}
