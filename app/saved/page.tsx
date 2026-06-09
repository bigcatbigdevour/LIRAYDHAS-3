'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  listSavedDays,
  unsaveDay,
  updateNote,
  saveDay,
  groupByMonth,
  searchSavedDays,
  exportToText,
  type SavedDay,
} from '@/lib/savedDays';
import SavedHeatmap from '@/components/SavedHeatmap';
import PullToRefresh from '@/components/PullToRefresh';
import { tap as hapticTap } from '@/lib/haptics';

export default function SavedPage() {
  const [mounted, setMounted] = useState(false);
  const [days, setDays] = useState<SavedDay[]>([]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState('');
  const [exportOpen, setExportOpen] = useState(false);

  // Compose-entry state: a pure journal entry without a daily reading.
  // User picks a date and writes a note. Used to backfill, or to journal
  // on days they didn't read the reading.
  const [composeOpen, setComposeOpen] = useState(false);
  const todayIso = new Date().toISOString().slice(0, 10);
  const [composeDate, setComposeDate] = useState(todayIso);
  const [composeBody, setComposeBody] = useState('');

  useEffect(() => {
    setMounted(true);
    setDays(listSavedDays());
  }, []);

  // Search filters before grouping so an entire month doesn't appear in
  // the table of contents if none of its entries matched.
  const filtered = useMemo(() => searchSavedDays(days, query), [days, query]);
  const months = useMemo(() => groupByMonth(filtered), [filtered]);

  const stats = useMemo(() => {
    if (days.length === 0) return null;
    const sorted = days.slice().sort((a, b) => (a.dateIso < b.dateIso ? -1 : 1));
    const first = sorted[0];
    const firstDate = new Date(first.dateIso + 'T12:00:00');
    const monthsSpanned =
      (new Date().getFullYear() - firstDate.getFullYear()) * 12 +
      (new Date().getMonth() - firstDate.getMonth()) +
      1;
    const withNotes = days.filter((d) => d.note && d.note.trim().length > 0).length;
    return { count: days.length, monthsSpanned: Math.max(1, monthsSpanned), withNotes };
  }, [days]);

  if (!mounted) return null;

  return (
    <PullToRefresh onRefresh={async () => { setDays(listSavedDays()); }}>
    <main className="page max-w-md mx-auto fade-in">
      <header className="pb-6">
        <p className="small-label caps">Saved</p>
        <h1 className="h-display serif mt-3">Your journal.</h1>
        <p className="serif text-[14.5px] text-ink-dim mt-3 leading-relaxed">
          The days you marked, kept in order. Nothing leaves your phone.
        </p>
        {stats && (
          <p className="small-label caps text-ink-faint mt-3" style={{ letterSpacing: '0.14em' }}>
            <span className="text-ink">{stats.count}</span> day{stats.count === 1 ? '' : 's'}
            <span className="mx-1.5">·</span>
            spanning <span className="text-ink">{stats.monthsSpanned}</span> month{stats.monthsSpanned === 1 ? '' : 's'}
            {stats.withNotes > 0 && (
              <>
                <span className="mx-1.5">·</span>
                <span className="text-ink">{stats.withNotes}</span> with notes
              </>
            )}
          </p>
        )}

        <button
          type="button"
          onClick={() => {
            hapticTap('light');
            setComposeOpen((v) => !v);
            if (!composeOpen) {
              setComposeDate(todayIso);
              setComposeBody('');
            }
          }}
          className="small-label caps text-accent hover:underline mt-4 inline-block"
          style={{ letterSpacing: '0.16em' }}
          aria-expanded={composeOpen}
        >
          {composeOpen ? '× close' : '+ new entry'}
        </button>

        {composeOpen && (
          <div className="mt-3 border-l-2 border-accent pl-3 py-2 fade-in">
            <p
              className="small-label caps text-accent"
              style={{ letterSpacing: '0.14em' }}
            >
              write an entry
            </p>
            <p className="text-[12.5px] text-ink-dim serif mt-1 leading-relaxed">
              For days you want to journal without a reading attached. Or to
              backfill a past day.
            </p>
            <label className="block mt-3">
              <span className="small-label caps text-ink-faint" style={{ letterSpacing: '0.14em' }}>
                date
              </span>
              <input
                type="date"
                value={composeDate}
                max={todayIso}
                onChange={(e) => setComposeDate(e.currentTarget.value)}
                className="block mt-1 bg-bg border border-hairline px-2 py-1 text-[13.5px] text-ink"
              />
            </label>
            <label className="block mt-3">
              <span className="small-label caps text-ink-faint" style={{ letterSpacing: '0.14em' }}>
                note
              </span>
              <textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.currentTarget.value)}
                rows={4}
                placeholder="what's happening — a memory, an intention, what you noticed"
                className="w-full mt-1 bg-bg border border-hairline p-2 text-[13.5px] text-ink serif leading-relaxed"
                style={{ resize: 'vertical' }}
              />
            </label>
            <div className="flex flex-wrap gap-3 mt-3 items-center">
              <button
                type="button"
                onClick={() => {
                  if (!composeBody.trim()) return;
                  hapticTap('medium');
                  saveDay({
                    dateIso: composeDate,
                    paragraph: '',
                    note: composeBody.trim(),
                    savedAt: Date.now(),
                  });
                  setDays(listSavedDays());
                  setComposeOpen(false);
                  setComposeBody('');
                }}
                disabled={!composeBody.trim()}
                className="btn-ghost"
              >
                save entry
              </button>
              <button
                type="button"
                onClick={() => {
                  setComposeOpen(false);
                  setComposeBody('');
                }}
                className="small-label caps text-ink-faint hover:text-ink"
              >
                cancel
              </button>
            </div>
          </div>
        )}
      </header>

      {days.length === 0 && !composeOpen && (
        <section className="border border-hairline p-6 text-center">
          <p className="serif text-ink-dim text-[14px]">
            Nothing here yet. Tap <span className="text-ink">☆ save</span> on a
            day's reading to keep it — or write a new entry above.
          </p>
          <Link href="/today" className="btn-ghost mt-4 inline-block">
            go to today →
          </Link>
        </section>
      )}

      {days.length > 0 && (
        <>
          <SavedHeatmap days={days} todayIso={todayIso} />

          <div className="mb-6 flex items-center gap-2 border-b border-hairline pb-3">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              placeholder="search paragraphs, notes, transits…"
              className="flex-1 bg-bg border-0 border-b border-transparent focus:border-accent focus:outline-none text-[13.5px] text-ink serif py-1.5"
              aria-label="search saved readings"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="small-label caps text-ink-faint hover:text-ink"
              >
                clear
              </button>
            )}
            {days.length >= 3 && (
              <button
                type="button"
                onClick={() => {
                  hapticTap('light');
                  // Pick a random saved day, scroll to it, and briefly
                  // flash the entry so the page acts like a journal you
                  // can flip open. Uses the day's month anchor as the
                  // jump target (we don't have per-day anchors).
                  const pick = days[Math.floor(Math.random() * days.length)];
                  const anchor = `m-${pick.dateIso.slice(0, 7)}`;
                  const el = document.getElementById(anchor);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="small-label caps text-ink-faint hover:text-ink shrink-0"
                title="open the journal to a random day"
                aria-label="show me a random saved day"
              >
                ↬ random
              </button>
            )}
          </div>

          {filtered.length === 0 && (
            <p className="text-ink-dim italic text-[13px] mb-6">
              nothing matches "{query}".
            </p>
          )}

          {filtered.length > 0 && months.length > 1 && (
            <nav
              aria-label="jump to month"
              className="mb-6 flex flex-wrap gap-x-3 gap-y-1 text-[10px] caps text-ink-faint border-l-2 border-hairline pl-3"
              style={{ letterSpacing: '0.12em' }}
            >
              <span className="text-ink-faint">jump to ·</span>
              {months.map((m) => (
                <a key={m.key} href={`#m-${m.key}`} className="hover:text-ink">
                  {m.label.toLowerCase()}
                </a>
              ))}
            </nav>
          )}

          {months.map((month) => (
            <section key={month.key} id={`m-${month.key}`} className="mb-10 scroll-mt-4">
              <h2
                className="small-label caps text-accent border-b border-hairline pb-1.5 mb-4"
                style={{ letterSpacing: '0.2em' }}
              >
                {month.label.toLowerCase()}
              </h2>
              <div className="space-y-6">
                {month.days.map((d) => {
                  const date = new Date(d.dateIso + 'T12:00:00');
                  const dateStr = date.toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
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
                          {d.snapshot && (d.snapshot.moonPhase || d.snapshot.chapter || d.snapshot.ageYears != null) && (
                            <p
                              className="small-label caps text-ink-faint mt-0.5 text-[10px]"
                              style={{ letterSpacing: '0.14em' }}
                            >
                              {d.snapshot.ageYears != null && <>age {d.snapshot.ageYears.toFixed(1)} · </>}
                              {d.snapshot.moonPhase}
                              {d.snapshot.moonSign && <> · moon in {d.snapshot.moonSign.toLowerCase()}</>}
                              {d.snapshot.chapter && <> · {d.snapshot.chapter.toLowerCase()}</>}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <button
                            type="button"
                            onClick={async () => {
                              hapticTap('light');
                              const lines = [
                                dateStr.toUpperCase(),
                                d.headline ? `(${d.headline})` : '',
                                '',
                                d.paragraph || '',
                                d.note ? '\n— note —\n' + d.note : '',
                              ].filter(Boolean).join('\n');
                              try {
                                if (navigator.share) {
                                  await navigator.share({ title: dateStr, text: lines });
                                } else {
                                  await navigator.clipboard.writeText(lines);
                                  const el = document.getElementById(`copy-${d.dateIso}`);
                                  if (el) {
                                    el.style.opacity = '1';
                                    window.setTimeout(() => { el.style.opacity = '0'; }, 1500);
                                  }
                                }
                              } catch {/* cancelled */}
                            }}
                            className="small-label caps text-ink-faint hover:text-ink"
                            aria-label="share this entry"
                          >
                            share
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              hapticTap('light');
                              if (!confirm('Remove this day from saved?')) return;
                              unsaveDay(d.dateIso);
                              setDays(listSavedDays());
                            }}
                            className="small-label caps text-ink-faint hover:text-accent"
                            aria-label="remove from saved"
                          >
                            remove
                          </button>
                        </div>
                      </header>
                      <span
                        id={`copy-${d.dateIso}`}
                        className="small-label caps text-accent block text-right -mt-2 mb-1"
                        style={{ opacity: 0, transition: 'opacity 300ms ease', height: '1em' }}
                        aria-hidden
                      >
                        copied
                      </span>

                      {d.paragraph && (
                        <p className="serif text-[14.5px] text-ink leading-relaxed">
                          {d.paragraph}
                        </p>
                      )}

                      {!d.paragraph && !d.note && (
                        <p className="serif text-[13px] text-ink-faint italic">
                          (empty entry — add a note below)
                        </p>
                      )}

                      {!isEditing && d.note && (
                        <div className={`${d.paragraph ? 'mt-3' : ''} border-l-2 border-accent pl-3 py-1`}>
                          <p
                            className="small-label caps text-accent mb-1"
                            style={{ letterSpacing: '0.12em' }}
                          >
                            {d.paragraph ? 'your note' : 'journal'}
                          </p>
                          <p className="serif text-[14px] text-ink whitespace-pre-wrap leading-relaxed">
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
              </div>
            </section>
          ))}

          <section className="mt-10 border-t border-hairline pt-5">
            <button
              type="button"
              onClick={() => {
                hapticTap('light');
                setExportOpen((v) => !v);
              }}
              className="small-label caps text-ink-faint hover:text-ink"
              style={{ letterSpacing: '0.16em' }}
              aria-expanded={exportOpen}
            >
              {exportOpen ? '− hide export' : '+ export this journal'}
            </button>
            {exportOpen && (
              <div className="mt-3">
                <p className="text-ink-dim text-[13px] serif leading-relaxed mb-2">
                  Your journal as plain text. Copy it, mail it to yourself,
                  drop it in a notes app — it's yours.
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    type="button"
                    onClick={async () => {
                      hapticTap('light');
                      const txt = exportToText(days);
                      try {
                        if (navigator.share) {
                          await navigator.share({ title: 'My Liraydhas journal', text: txt });
                        } else {
                          await navigator.clipboard.writeText(txt);
                          const el = document.getElementById('export-toast');
                          if (el) {
                            el.style.opacity = '1';
                            window.setTimeout(() => { el.style.opacity = '0'; }, 1500);
                          }
                        }
                      } catch {/* user cancelled */}
                    }}
                    className="btn-ghost"
                  >
                    share / copy
                  </button>
                  <span
                    id="export-toast"
                    className="small-label caps text-accent self-center"
                    style={{ opacity: 0, transition: 'opacity 300ms ease' }}
                  >
                    copied
                  </span>
                </div>
                <pre className="text-[11.5px] text-ink-dim font-mono whitespace-pre-wrap leading-relaxed border border-hairline p-3 max-h-72 overflow-auto">
{exportToText(days)}
                </pre>
              </div>
            )}
          </section>
        </>
      )}

      <section className="mt-12 space-y-2">
        <Link href="/today" className="btn-ghost block">today →</Link>
        <Link href="/about" className="btn-ghost block">about →</Link>
      </section>
    </main>
    </PullToRefresh>
  );
}
