'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { isSaved, saveDay, listSavedDays, type SavedDay } from '@/lib/savedDays';
import { tap as hapticTap } from '@/lib/haptics';

interface Props {
  /** Set of dateIsos already in /saved (so we hide overlapping entries
   *  from the Recent strip — those already live in the journal proper). */
  savedDates: Set<string>;
  /** Called after the user saves one of these — so /saved can re-read. */
  onSaved: () => void;
}

/**
 * "Recent" strip on /saved — surfaces the last 30 days of daily LLM
 * readings that the user DIDN'T tap save on.
 *
 * The store automatically caches every daily reading for 30 days in
 * `history: DailyReport[]`. Previously this was only used for the
 * "past week" section on /today. Now /saved exposes it as a quiet
 * "you didn't save these but they're still here" archive so users who
 * forgot to save an interesting paragraph can recover it.
 *
 * Each entry has a one-tap "save" that promotes it to a full SavedDay.
 * The Recent strip then drops the entry (since it's now in the journal
 * proper).
 *
 * Collapsed by default — only renders the count + "expand" affordance
 * unless the user opts in. Keeps the /saved page focused on the user's
 * intentional saves.
 */
export default function RecentReadingsStrip({ savedDates, onSaved }: Props) {
  const history = useStore((s) => s.history);
  const [expanded, setExpanded] = useState(false);

  const recent = useMemo(
    () => history.filter((h) => !savedDates.has(h.date)),
    [history, savedDates],
  );

  if (recent.length === 0) return null;

  return (
    <section className="mb-8 border-l-2 border-hairline pl-3">
      <button
        type="button"
        onClick={() => {
          hapticTap('light');
          setExpanded((v) => !v);
        }}
        className="small-label caps text-ink-faint hover:text-ink flex items-center gap-2 w-full"
        style={{ letterSpacing: '0.18em' }}
        aria-expanded={expanded}
      >
        <span className="text-[10px]">{expanded ? '▼' : '▶'}</span>
        recent · {recent.length} unsaved reading{recent.length === 1 ? '' : 's'} from the past 30 days
      </button>

      {expanded && (
        <div className="space-y-4 mt-3 fade-in">
          {recent.map((r) => {
            const date = new Date(r.date + 'T12:00:00');
            const dateStr = date.toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            });
            const tightest = r.transits?.[0];
            const headline = tightest
              ? `${tightest.transitPlanet} ${tightest.aspect} ${tightest.natalPlanet} · ${tightest.orb.toFixed(1)}°`
              : undefined;
            return (
              <article
                key={r.date}
                className="border-l border-hairline pl-3 py-1"
              >
                <header className="flex items-baseline justify-between gap-3 mb-1">
                  <div>
                    <p className="serif text-[14px] text-ink">{dateStr}</p>
                    {headline && (
                      <p
                        className="small-label caps text-ink-faint mt-0.5 text-[10px]"
                        style={{ letterSpacing: '0.14em' }}
                      >
                        {headline}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      hapticTap('medium');
                      saveDay({
                        dateIso: r.date,
                        paragraph: r.paragraph,
                        headline,
                        savedAt: Date.now(),
                      });
                      onSaved();
                    }}
                    className="small-label caps text-ink-faint hover:text-accent shrink-0"
                    aria-label="save this reading to the journal"
                  >
                    ☆ save
                  </button>
                </header>
                <p className="serif text-[13.5px] text-ink-dim leading-relaxed line-clamp-3">
                  {r.paragraph}
                </p>
              </article>
            );
          })}
          <p
            className="small-label caps text-ink-faint text-[10px] italic"
            style={{ letterSpacing: '0.14em' }}
          >
            readings only — the store keeps 30 days · they vanish on day 31 if
            you don't save them.
          </p>
        </div>
      )}
    </section>
  );
}
