'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listSavedDays, unsaveDay, updateNote, type SavedDay } from '@/lib/savedDays';
import { tap as hapticTap } from '@/lib/haptics';

export default function SavedPage() {
  const [mounted, setMounted] = useState(false);
  const [days, setDays] = useState<SavedDay[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState('');

  useEffect(() => {
    setMounted(true);
    setDays(listSavedDays());
  }, []);

  if (!mounted) return null;

  return (
    <main className="page max-w-md mx-auto fade-in">
      <header className="pb-6">
        <p className="small-label caps">Saved</p>
        <h1 className="h-display serif mt-3">Days you marked.</h1>
        <p className="serif text-[14.5px] text-ink-dim mt-3 leading-relaxed">
          Your private timeline. Readings live here for as long as you keep
          this device. Nothing leaves your phone.
        </p>
      </header>

      {days.length === 0 && (
        <section className="border border-hairline p-6 text-center">
          <p className="serif text-ink-dim text-[14px]">
            Nothing here yet. Tap <span className="text-ink">☆ save</span> on a
            day's reading to keep it.
          </p>
          <Link href="/today" className="btn-ghost mt-4 inline-block">
            go to today →
          </Link>
        </section>
      )}

      {days.length > 0 && (
        <section className="space-y-6">
          {days.map((d) => {
            const date = new Date(d.dateIso + 'T12:00:00');
            const dateStr = date.toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            });
            const isEditing = editing === d.dateIso;
            return (
              <article
                key={d.dateIso}
                className="border-l-2 border-hairline pl-3 py-1"
              >
                <header className="flex items-baseline justify-between gap-3 mb-2">
                  <div>
                    <p className="serif text-[15px] text-ink">{dateStr}</p>
                    {d.headline && (
                      <p
                        className="small-label caps text-ink-faint mt-0.5"
                        style={{ letterSpacing: '0.1em' }}
                      >
                        {d.headline}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      hapticTap('light');
                      if (!confirm('Remove this day from saved?')) return;
                      unsaveDay(d.dateIso);
                      setDays(listSavedDays());
                    }}
                    className="small-label caps text-ink-faint hover:text-accent shrink-0"
                    aria-label="remove from saved"
                  >
                    remove
                  </button>
                </header>

                <p className="serif text-[14.5px] text-ink leading-relaxed">
                  {d.paragraph}
                </p>

                {!isEditing && d.note && (
                  <div className="mt-3 border-l-2 border-accent pl-3 py-1">
                    <p className="small-label caps text-accent mb-1" style={{ letterSpacing: '0.12em' }}>
                      your note
                    </p>
                    <p className="serif text-[13.5px] text-ink-dim whitespace-pre-wrap leading-relaxed">
                      {d.note}
                    </p>
                  </div>
                )}

                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      hapticTap('light');
                      setEditing(d.dateIso);
                      setDraftNote(d.note ?? '');
                    }}
                    className="small-label caps text-ink-faint hover:text-ink mt-3"
                  >
                    {d.note ? 'edit note' : '+ add a note'}
                  </button>
                )}

                {isEditing && (
                  <div className="mt-3">
                    <textarea
                      value={draftNote}
                      onChange={(e) => setDraftNote(e.currentTarget.value)}
                      rows={3}
                      placeholder="what was happening on this day — a memory, a context, something you want to remember"
                      className="w-full bg-bg border border-hairline p-2 text-[13.5px] text-ink serif leading-relaxed"
                      style={{ resize: 'vertical' }}
                    />
                    <div className="flex gap-3 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          hapticTap('medium');
                          updateNote(d.dateIso, draftNote.trim());
                          setEditing(null);
                          setDays(listSavedDays());
                        }}
                        className="btn-ghost"
                      >
                        save note
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="small-label caps text-ink-faint hover:text-ink"
                      >
                        cancel
                      </button>
                    </div>
                  </div>
                )}

                <p
                  className="small-label caps text-ink-faint mt-3 text-[10px]"
                  style={{ letterSpacing: '0.14em' }}
                >
                  saved {new Date(d.savedAt).toLocaleDateString()}
                </p>
              </article>
            );
          })}
        </section>
      )}

      <section className="mt-12 space-y-2">
        <Link href="/today" className="btn-ghost block">today →</Link>
        <Link href="/about" className="btn-ghost block">about →</Link>
      </section>
    </main>
  );
}
