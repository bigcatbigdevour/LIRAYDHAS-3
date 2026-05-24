'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PlaceAutocomplete from '@/components/PlaceAutocomplete';
import { buildBlueprint } from '@/lib/blueprint';
import { useStore } from '@/lib/store';
import type { GeocodeResult } from '@/lib/types';

export default function Onboarding() {
  const router = useRouter();
  const blueprint = useStore((s) => s.blueprint);
  const setBlueprint = useStore((s) => s.setBlueprint);

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [placeQuery, setPlaceQuery] = useState('');
  const [picked, setPicked] = useState<{ r: GeocodeResult; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // already onboarded? skip ahead.
    const t = setTimeout(() => {
      if (blueprint) router.replace('/today');
    }, 30);
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

  return (
    <main className="page max-w-md mx-auto fade-in">
      <header className="pt-6 pb-12">
        <p className="small-label caps">liraydhas</p>
        <h1 className="h-display serif mt-4">
          Tell me where<br />you started.
        </h1>
        <p className="text-ink-dim text-[14px] mt-3 max-w-sm">
          Date, time, and place of birth. This stays on your device.
        </p>
      </header>

      <section className="space-y-8">
        <Field label="Date of birth">
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max="2026-12-31"
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
              {timeUnknown ? '✓ exact unknown' : 'I don’t know'}
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
              Defaulting to noon. Houses, rising, and profile will be soft.
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
