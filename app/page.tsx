'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import SacredGeometry from '@/components/SacredGeometry';
import PsycheMap from '@/components/PsycheMap';
import {
  loadSession,
  saveSession,
  newSessionId,
} from '@/lib/storage';
import type {
  PsycheEntry,
  PsycheSession,
  AnalyzeResponseBody,
} from '@/lib/types';

type Phase = 'opening' | 'loading-first' | 'asking' | 'error';

export default function Page() {
  const [phase, setPhase] = useState<Phase>('opening');
  const [session, setSession] = useState<PsycheSession | null>(null);

  // The question currently on screen (not yet answered).
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [draft, setDraft] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);

  const dwellStartRef = useRef<number>(0);
  const wasRevisedRef = useRef<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Restore any prior session on mount.
  useEffect(() => {
    const existing = loadSession();
    if (existing && existing.entries.length > 0) {
      setSession(existing);
      // Resume by generating the next question from history.
      setPhase('loading-first');
      void fetchNextQuestion(existing).then((q) => {
        if (q) {
          setCurrentQuestion(q);
          setPhase('asking');
          dwellStartRef.current = Date.now();
        } else {
          setPhase('error');
        }
      });
    }
  }, []);

  // Auto-grow the textarea as the user types.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 288)}px`;
  }, [draft, currentQuestion]);

  const history = useMemo(
    () =>
      (session?.entries ?? []).map((e) => ({
        question: e.question,
        answer: e.answer,
      })),
    [session]
  );

  async function begin() {
    setError(null);
    setPhase('loading-first');
    const fresh: PsycheSession = {
      sessionId: newSessionId(),
      startedAt: Date.now(),
      entries: [],
    };
    setSession(fresh);
    saveSession(fresh);
    const q = await fetchNextQuestion(fresh);
    if (!q) {
      setPhase('error');
      return;
    }
    setCurrentQuestion(q);
    setDraft('');
    wasRevisedRef.current = false;
    dwellStartRef.current = Date.now();
    setPhase('asking');
    // Bring keyboard focus to the answer field.
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  async function fetchNextQuestion(
    s: PsycheSession
  ): Promise<string | null> {
    try {
      const res = await fetch('/api/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: s.entries.map((e) => ({
            question: e.question,
            answer: e.answer,
          })),
        }),
      });
      if (!res.ok) {
        const body = await safeJson(res);
        setError(body?.error ?? 'The line went quiet.');
        return null;
      }
      const data = (await res.json()) as { question?: string };
      if (!data.question) {
        setError('No question returned.');
        return null;
      }
      return data.question;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'The line went quiet.'
      );
      return null;
    }
  }

  async function submit() {
    if (!session) return;
    const answer = draft.trim();
    if (!answer || submitting) return;

    setSubmitting(true);
    setError(null);

    const priorThemes = uniqueThemes(session.entries);
    const dwellMs = dwellStartRef.current
      ? Date.now() - dwellStartRef.current
      : undefined;

    // Kick off analysis and next-question fetch in parallel.
    const analysisPromise = fetchAnalysis(
      currentQuestion,
      answer,
      priorThemes
    );

    // Provisional entry so the next question's history includes this answer.
    const provisional: PsycheEntry = {
      id: `${session.sessionId}:${session.entries.length}`,
      sessionId: session.sessionId,
      index: session.entries.length,
      question: currentQuestion,
      answer,
      timestamp: Date.now(),
      themes: [],
      certaintyScore: 0.5,
      contradictions: [],
      resistance: [],
      depthTier: Math.floor(session.entries.length / 5),
      wordCount: answer.split(/\s+/).filter(Boolean).length,
      engagement: {
        dwellMs,
        revised: wasRevisedRef.current,
      },
    };

    const withProvisional: PsycheSession = {
      ...session,
      entries: [...session.entries, provisional],
    };

    const nextQPromise = fetchNextQuestion(withProvisional);

    const [analysis, nextQ] = await Promise.all([
      analysisPromise,
      nextQPromise,
    ]);

    // Merge analysis into the entry.
    const finalEntry: PsycheEntry = analysis
      ? {
          ...provisional,
          themes: analysis.themes,
          certaintyScore: analysis.certaintyScore,
          contradictions: analysis.contradictions,
          resistance: analysis.resistance,
        }
      : provisional;

    const updated: PsycheSession = {
      ...session,
      entries: [...session.entries, finalEntry],
    };
    setSession(updated);
    saveSession(updated);

    if (!nextQ) {
      setPhase('error');
      setSubmitting(false);
      return;
    }

    setCurrentQuestion(nextQ);
    setDraft('');
    wasRevisedRef.current = false;
    dwellStartRef.current = Date.now();
    setSubmitting(false);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  async function fetchAnalysis(
    question: string,
    answer: string,
    priorThemes: string[]
  ): Promise<AnalyzeResponseBody | null> {
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer, priorThemes }),
      });
      if (!res.ok) return null;
      return (await res.json()) as AnalyzeResponseBody;
    } catch {
      return null;
    }
  }

  function goBack() {
    if (!session || submitting) return;
    if (session.entries.length === 0) return;

    // Pop the last entry so the just-completed question becomes current again.
    const last = session.entries[session.entries.length - 1];
    const trimmed: PsycheSession = {
      ...session,
      entries: session.entries.slice(0, -1),
    };
    setSession(trimmed);
    saveSession(trimmed);
    setCurrentQuestion(last.question);
    setDraft(last.answer);
    wasRevisedRef.current = true;
    dwellStartRef.current = Date.now();
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Cmd/Ctrl + Enter submits. Plain Enter inserts a newline.
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      void submit();
    }
  }

  return (
    <div className="app-frame">
      <SacredGeometry />

      {phase !== 'opening' && (
        <button
          className="psyche-toggle"
          onClick={() => setMapOpen(true)}
          aria-label="Open psyche map"
        >
          Psyche
        </button>
      )}

      <main className="stage">
        {phase === 'opening' && (
          <section className="opening">
            <h1 className="wordmark">LIRAYDHAS</h1>
            <button className="begin-button" onClick={begin}>
              Begin
            </button>
          </section>
        )}

        {phase === 'loading-first' && (
          <section className="qa">
            <p className="question loading breathe">listening</p>
          </section>
        )}

        {phase === 'asking' && (
          <section className="qa">
            <p className="question">{currentQuestion}</p>
            <textarea
              ref={textareaRef}
              className="answer-input"
              placeholder="answer"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              rows={2}
              disabled={submitting}
            />
            <div className="qa-actions">
              <button
                className="text-button"
                onClick={goBack}
                disabled={submitting || (session?.entries.length ?? 0) === 0}
              >
                Back
              </button>
              {submitting && (
                <span className="qa-header breathe">thinking</span>
              )}
              <button
                className="submit-button"
                onClick={submit}
                disabled={submitting || draft.trim().length === 0}
              >
                Submit
              </button>
            </div>
            {error && <p className="error-line">{error}</p>}
          </section>
        )}

        {phase === 'error' && (
          <section className="qa">
            <p className="question">{error ?? 'Something broke the silence.'}</p>
            <div className="qa-actions" style={{ justifyContent: 'center' }}>
              <button
                className="submit-button"
                onClick={() => {
                  setError(null);
                  if (session) {
                    setPhase('loading-first');
                    void fetchNextQuestion(session).then((q) => {
                      if (q) {
                        setCurrentQuestion(q);
                        setPhase('asking');
                        dwellStartRef.current = Date.now();
                      } else {
                        setPhase('error');
                      }
                    });
                  } else {
                    setPhase('opening');
                  }
                }}
              >
                Continue
              </button>
            </div>
          </section>
        )}
      </main>

      <PsycheMap
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        entries={session?.entries ?? []}
      />
    </div>
  );
}

function uniqueThemes(entries: PsycheEntry[]): string[] {
  const set = new Set<string>();
  for (const e of entries) for (const t of e.themes) set.add(t);
  return Array.from(set);
}

async function safeJson(res: Response): Promise<any | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
