'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { tap as hapticTap, success as hapticSuccess } from '@/lib/haptics';

interface Props {
  /** Called when the user finishes or dismisses the tour. */
  onDone: () => void;
}

interface Step {
  /** Tiny SVG icon for the step. */
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  body: React.ReactNode;
}

/**
 * Three-card swipeable intro shown to brand-new users on their first
 * /today visit after onboarding. Replaces the old single welcome card
 * with a small tour: what today is, what the journal is, what the
 * other surfaces are. Each step keeps the brand voice — calm,
 * observational, no exclamation points.
 *
 * Self-clearing: the parent owns the localStorage flag and renders
 * this only when the welcome flag is set. Tapping "begin" on the
 * final step (or "skip" anywhere) calls onDone, which is responsible
 * for clearing the flag.
 *
 * Step indicator: tiny dots beneath the body — tappable to jump
 * between steps. Keyboard arrows also navigate.
 */
export default function WelcomeTour({ onDone }: Props) {
  const [step, setStep] = useState(0);

  const STEPS: Step[] = [
    {
      icon: (
        <svg viewBox="0 0 40 40" className="w-14 h-14" aria-hidden>
          <circle cx="20" cy="20" r="14" fill="none" stroke="#f4f1ea" strokeWidth="0.7" opacity="0.5">
            <animate attributeName="r" values="14;15;14" dur="6s" repeatCount="indefinite" />
          </circle>
          <circle cx="20" cy="20" r="8" fill="none" stroke="#f4f1ea" strokeWidth="0.6" opacity="0.7" />
          <circle cx="20" cy="20" r="2.5" fill="#8b3a3a">
            <animate attributeName="opacity" values="1;0.55;1" dur="4.5s" repeatCount="indefinite" />
          </circle>
        </svg>
      ),
      eyebrow: '01 · today',
      title: 'One paragraph a day.',
      body: (
        <>
          Built from your chart and where the sky is right now. A
          glance line on top, the full reading below. Pull down to
          refresh; the one-line takeaway is what to sit with.
        </>
      ),
    },
    {
      icon: (
        <svg viewBox="0 0 40 40" className="w-14 h-14" aria-hidden>
          <path d="M 12 8 L 28 8 L 28 32 L 20 28 L 12 32 Z" fill="none" stroke="#f4f1ea" strokeWidth="0.7" opacity="0.6" />
          <path d="M 15 14 L 25 14 M 15 18 L 25 18 M 15 22 L 22 22" stroke="#f4f1ea" strokeWidth="0.5" opacity="0.55" />
          <circle cx="29" cy="11" r="2" fill="#8b3a3a" opacity="0.8" />
        </svg>
      ),
      eyebrow: '02 · saved',
      title: 'A private journal.',
      body: (
        <>
          Tap <span className="text-ink">☆ save</span> on any reading
          to keep it. Add a note, a tag, a photo, a voice note.
          Everything lives only on your device. A year from now,{' '}
          <span className="text-ink">today</span> will surface what you
          marked today.
        </>
      ),
    },
    {
      icon: (
        <svg viewBox="0 0 40 40" className="w-14 h-14" aria-hidden>
          <path d="M 4 30 Q 12 12 20 18 Q 28 24 36 12" fill="none" stroke="#f4f1ea" strokeWidth="0.7" opacity="0.6" />
          <circle cx="20" cy="18" r="1.6" fill="#8b3a3a" opacity="0.85" />
          <line x1="20" y1="14" x2="20" y2="22" stroke="#8b3a3a" strokeWidth="0.6" opacity="0.5" />
        </svg>
      ),
      eyebrow: '03 · your design',
      title: 'A view of your whole life.',
      body: (
        <>
          The other tabs are slower. Chart shows your design. Arcs
          draws every cycle of a lifetime. Polarity shows what&apos;s
          rising and what&apos;s descending. Take any of them at your
          own pace. Read the{' '}
          <Link href="/learn" className="text-accent underline">guide</Link>{' '}
          when you want depth.
        </>
      ),
    },
  ];

  // Keyboard navigation — arrows move between steps, ESC dismisses.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        if (step < STEPS.length - 1) setStep(step + 1);
      } else if (e.key === 'ArrowLeft') {
        if (step > 0) setStep(step - 1);
      } else if (e.key === 'Escape') {
        onDone();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, onDone, STEPS.length]);

  const cur = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <section
      className="mb-8 border border-accent p-5 fade-in"
      role="dialog"
      aria-label="welcome to liraydhas"
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0 mt-1">{cur.icon}</div>
        <div className="flex-1 min-w-0">
          <p
            className="small-label caps text-accent"
            style={{ letterSpacing: '0.2em' }}
          >
            {cur.eyebrow}
          </p>
          <h3 className="serif text-ink text-[18px] mt-2 leading-snug">
            {cur.title}
          </h3>
          <p className="serif text-[13.5px] text-ink-dim mt-2 leading-relaxed">
            {cur.body}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-5">
        <button
          type="button"
          onClick={() => {
            hapticTap('light');
            onDone();
          }}
          className="small-label caps text-ink-faint hover:text-ink"
          style={{ letterSpacing: '0.16em' }}
          aria-label="skip the welcome tour"
        >
          skip
        </button>

        <div className="flex items-center gap-2" role="tablist" aria-label="step indicator">
          {STEPS.map((_, i) => (
            <button
              type="button"
              key={i}
              onClick={() => { hapticTap('light'); setStep(i); }}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === step ? 'bg-accent' : 'bg-hairline hover:bg-ink-faint'
              }`}
              role="tab"
              aria-selected={i === step}
              aria-label={`step ${i + 1} of ${STEPS.length}`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            hapticTap(isLast ? 'medium' : 'light');
            if (isLast) {
              hapticSuccess();
              onDone();
            } else {
              setStep(step + 1);
            }
          }}
          className="small-label caps text-accent"
          style={{ letterSpacing: '0.18em' }}
        >
          {isLast ? 'begin' : 'next →'}
        </button>
      </div>
    </section>
  );
}
