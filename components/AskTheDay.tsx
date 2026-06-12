'use client';

import { useEffect, useRef, useState } from 'react';
import type { Blueprint } from '@/lib/types';
import { api } from '@/lib/apiBase';
import { friendlyError } from '@/lib/friendlyError';
import { tap as hapticTap } from '@/lib/haptics';
import { saveDay } from '@/lib/savedDays';
import { localDateStr } from '@/lib/localDate';

interface Props {
  blueprint: Blueprint;
}

const MAX_CHARS = 240;

/**
 * "Ask the day" — collapsed by default. Tap to expand a small textarea;
 * type one line of context (work, a relationship, a decision); get back
 * a short paragraph framed by today's transits to the user's chart.
 *
 * Not advice, not an oracle. The system prompt bounds the model to:
 *   · not name astrology or Human Design in the response
 *   · not pretend to know what it can't (relationships, money, health)
 *   · not predict, not decide for the user
 *   · always end with a quiet observation
 *
 * One question costs one Claude call. Soft rate limit: while a request
 * is in flight the button disables; the textarea has a 240-char cap so
 * the prompt stays predictable.
 */
export default function AskTheDay({ blueprint }: Props) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open && textareaRef.current && !answer) {
      textareaRef.current.focus();
    }
  }, [open, answer]);

  async function ask() {
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await fetch(api('/api/ask'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ blueprint, question: q }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `error ${res.status}`);
      }
      const j = (await res.json()) as { paragraph: string };
      setAnswer(j.paragraph);
      hapticTap('medium');
    } catch (e) {
      setError(friendlyError(e instanceof Error ? e.message : null));
      hapticTap('light');
    } finally {
      setBusy(false);
    }
  }

  function startOver() {
    setAnswer(null);
    setError(null);
    setQuestion('');
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function attachAsNote() {
    if (!answer) return;
    const q = question.trim();
    const today = localDateStr();
    const text = `Asked: "${q}"\n\n${answer}`;
    saveDay({
      dateIso: today,
      paragraph: '',
      note: text,
      savedAt: Date.now(),
    });
    hapticTap('medium');
    // Visual confirm via temporary swap on the inline button label —
    // local state would do, but a simple class flash is enough.
    const el = document.getElementById('ask-attach-toast');
    if (el) {
      el.style.opacity = '1';
      window.setTimeout(() => { el.style.opacity = '0'; }, 1500);
    }
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
        + ask the day
      </button>
    );
  }

  return (
    <section className="mt-3 border-l-2 border-accent pl-3 py-1 fade-in max-w-md">
      <div className="flex items-baseline justify-between gap-2">
        <p
          className="small-label caps text-accent"
          style={{ letterSpacing: '0.14em' }}
        >
          ask the day
        </p>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setAnswer(null);
            setError(null);
            setQuestion('');
          }}
          className="small-label caps text-ink-faint hover:text-ink text-[10px]"
          style={{ letterSpacing: '0.14em' }}
          aria-label="close"
        >
          × close
        </button>
      </div>

      {!answer && (
        <>
          <p className="text-[12px] text-ink-dim serif mt-1 leading-relaxed">
            One line — a context or a question. The day will answer through
            your chart, not as advice.
          </p>
          <textarea
            ref={textareaRef}
            value={question}
            onChange={(e) => {
              const v = e.currentTarget.value.slice(0, MAX_CHARS);
              setQuestion(v);
            }}
            rows={2}
            placeholder="a job interview today · a hard conversation · what to do with the morning"
            className="w-full bg-bg border border-hairline p-2 text-[13.5px] text-ink serif leading-relaxed mt-2"
            style={{ resize: 'vertical' }}
            disabled={busy}
            maxLength={MAX_CHARS}
          />
          <div className="flex flex-wrap gap-3 items-center mt-2">
            <button
              type="button"
              onClick={() => { void ask(); }}
              disabled={!question.trim() || busy}
              className="btn-ghost"
            >
              {busy ? 'asking…' : 'ask'}
            </button>
            <span
              className="small-label caps text-ink-faint text-[10px] tabular-nums"
              style={{ letterSpacing: '0.14em' }}
            >
              {question.length}/{MAX_CHARS}
            </span>
          </div>
          {error && (
            <p className="small-label caps text-accent text-[10px] mt-2" style={{ letterSpacing: '0.14em' }}>
              {error}
            </p>
          )}
        </>
      )}

      {answer && (
        <>
          <p className="serif italic text-[13px] text-ink-faint mt-2 leading-relaxed">
            you asked: "{question}"
          </p>
          <p className="serif text-[14.5px] text-ink mt-2 leading-relaxed">
            {answer}
          </p>
          <div className="flex flex-wrap gap-3 mt-3 items-center">
            <button
              type="button"
              onClick={startOver}
              className="small-label caps text-ink-faint hover:text-ink"
              style={{ letterSpacing: '0.14em' }}
            >
              ask another
            </button>
            <button
              type="button"
              onClick={attachAsNote}
              className="small-label caps text-ink-faint hover:text-ink"
              style={{ letterSpacing: '0.14em' }}
            >
              keep this · save to today's journal
            </button>
            <span
              id="ask-attach-toast"
              className="small-label caps text-accent text-[10px]"
              style={{ opacity: 0, transition: 'opacity 300ms ease', letterSpacing: '0.14em' }}
            >
              saved
            </span>
          </div>
        </>
      )}
    </section>
  );
}
