'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import PlaceAutocomplete from '@/components/PlaceAutocomplete';
import { buildBlueprint } from '@/lib/blueprint';
import { useStore } from '@/lib/store';
import type { GeocodeResult } from '@/lib/types';

type Step = 'intro' | 'form';

export default function Onboarding() {
  const router = useRouter();
  const blueprint = useStore((s) => s.blueprint);
  const setBlueprint = useStore((s) => s.setBlueprint);

  const [step, setStep] = useState<Step>('intro');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [placeQuery, setPlaceQuery] = useState('');
  const [picked, setPicked] = useState<{ r: GeocodeResult; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maxDate, setMaxDate] = useState('');

  useEffect(() => {
    // set after mount so SSR/CSR agree on the initial render
    setMaxDate(new Date().toISOString().slice(0, 10));
  }, []);

  const checked = useRef(false);
  useEffect(() => {
    // already onboarded? skip ahead.
    const t = setTimeout(() => {
      if (blueprint && !checked.current) {
        checked.current = true;
        router.replace('/today');
      }
    }, 60);
    return () => clearTimeout(t);
  }, [blueprint, router]);

  const canSubmit =
    date.length === 10 &&
    (timeUnknown || time.length >= 4) &&
    !!picked;

  async function submit() {
    setError(null);
    if (!picked || !date) return;
    setBusy(true);
    try {
      const effectiveTime = timeUnknown ? '12:00' : time;
      const localIso = `${date}T${effectiveTime}`;
      const bp = buildBlueprint({
        localIso,
        lat: picked.r.latitude,
        lon: picked.r.longitude,
        place: picked.label,
        timeUnknown,
      });
      setBlueprint(bp);
      router.replace('/today');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  if (step === 'intro') {
    return (
      <main className="page max-w-md mx-auto fade-in min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-10">
          <div>
            <svg viewBox="0 0 80 80" className="w-20 h-20 mx-auto" aria-hidden>
              <g style={{ transformOrigin: '40px 40px' }}>
                <circle cx="40" cy="40" r="34" fill="none" stroke="#f4f1ea" strokeWidth="0.6" opacity="0.5">
                  <animateTransform attributeName="transform" type="rotate" from="0 40 40" to="360 40 40" dur="120s" repeatCount="indefinite" />
                </circle>
                <circle cx="40" cy="40" r="22" fill="none" stroke="#f4f1ea" strokeWidth="0.5" opacity="0.7">
                  <animateTransform attributeName="transform" type="rotate" from="0 40 40" to="-360 40 40" dur="90s" repeatCount="indefinite" />
                </circle>
              </g>
              <circle cx="40" cy="40" r="10" fill="none" stroke="#f4f1ea" strokeWidth="0.5"/>
              <circle cx="40" cy="40" r="3"  fill="#8b3a3a">
                <animate attributeName="opacity" values="1;0.55;1" dur="4.5s" repeatCount="indefinite" />
              </circle>
              {/* a tiny diamond orbiting the inner ring */}
              <g style={{ transformOrigin: '40px 40px' }}>
                <animateTransform attributeName="transform" type="rotate" from="0 40 40" to="360 40 40" dur="40s" repeatCount="indefinite" />
                <rect x="38" y="6" width="4" height="4" fill="#8b3a3a" transform="rotate(45 40 8)" opacity="0.6" />
              </g>
            </svg>
            <p className="caps small-label mt-6">liraydhas</p>
          </div>
          <h1 className="h-display serif" style={{ fontSize: 'clamp(2rem, 7vw, 2.6rem)', lineHeight: 1.15 }}>
            A daily reading<br />of the sky,<br />and your design.
          </h1>
          <p className="serif italic text-ink-dim text-[15px] max-w-sm leading-relaxed">
            Real astrology. Full Human Design. Every major life cycle drawn
            from age zero to ninety-two.
          </p>
          <p className="text-ink-faint text-[12px] max-w-xs caps" style={{ letterSpacing: '0.16em' }}>
            Enter your birth data once · the math runs on your phone · nothing is stored anywhere but here
          </p>
        </div>
        <div className="pb-10">
          <button className="btn-primary" onClick={() => setStep('form')}>
            Begin
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="page max-w-md mx-auto fade-in">
      <header className="pt-2 pb-10">
        <button
          onClick={() => setStep('intro')}
          className="small-label caps text-ink-faint hover:text-ink"
        >
          ← back
        </button>
        <h1 className="h-display serif mt-6">
          Tell me where<br />you started.
        </h1>
        <p className="text-ink-dim text-[14px] mt-3 max-w-sm leading-relaxed">
          Date, time, and place of birth. Your time matters most — without
          it the rising sign and houses go soft. Place determines the
          timezone, so a city that's close to where you were born is fine.
        </p>
      </header>

      <section className="space-y-8">
        <Field label="Date of birth">
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={maxDate || undefined}
            min="1900-01-01"
          />
        </Field>

        <Field
          label="Time of birth"
          aside={
            <button
              type="button"
              onClick={() => setTimeUnknown((v) => !v)}
              className="text-[10px] caps text-ink-dim hover:text-ink"
            >
              {timeUnknown ? '✓ unknown' : 'I don’t know'}
            </button>
          }
        >
          <input
            type="time"
            className="input"
            value={timeUnknown ? '12:00' : time}
            onChange={(e) => setTime(e.target.value)}
            disabled={timeUnknown}
          />
          {timeUnknown && (
            <p className="text-[12px] text-ink-dim mt-1 italic">
              Defaulting to noon. Rising sign, houses, and profile will be soft.
            </p>
          )}
        </Field>

        <Field label="Place of birth">
          <PlaceAutocomplete
            value={placeQuery}
            onChange={(v) => {
              setPlaceQuery(v);
              if (picked && v !== picked.label) setPicked(null);
            }}
            onPick={(r, label) => setPicked({ r, label })}
            placeholder="City, region, country"
          />
        </Field>
      </section>

      {error && <p className="text-accent mt-6 text-[13px]">{error}</p>}

      <div className="mt-12">
        <button className="btn-primary" disabled={!canSubmit || busy} onClick={submit}>
          {busy ? 'computing…' : 'Compute my blueprint'}
        </button>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
  aside,
}: {
  label: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="serif text-[20px] leading-tight">{label}</label>
        {aside}
      </div>
      {children}
    </div>
  );
}
