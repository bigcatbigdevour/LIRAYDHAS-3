'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore, useStoreHydrated } from '@/lib/store';
import PlaceAutocomplete from '@/components/PlaceAutocomplete';
import {
  addPartner,
  listPartners,
  removePartner,
  type SavedPartner,
} from '@/lib/partners';
import { buildBlueprint } from '@/lib/blueprint';
import { api } from '@/lib/apiBase';
import { friendlyError } from '@/lib/friendlyError';
import { readSseStream, isEventStream } from '@/lib/streamRead';
import { natalAspectMeaning } from '@/lib/astrology/aspectMeanings';
import { tap as hapticTap, success as hapticSuccess, warn as hapticWarn } from '@/lib/haptics';
import { localDateStr } from '@/lib/localDate';
import { ageInYears } from '@/lib/cycles';
import { currentChapter } from '@/lib/lifeChapters';
import FirstTimeIntro from '@/components/FirstTimeIntro';
import ProGate from '@/components/ProGate';
import type { GeocodeResult, SynastryReading } from '@/lib/types';

const RELATIONS = ['partner', 'family', 'friend', 'colleague', 'ex', 'other'] as const;

export default function CompatPage() {
  const router = useRouter();
  const hydrated = useStoreHydrated();
  const blueprint = useStore((s) => s.blueprint);
  const [partners, setPartners] = useState<SavedPartner[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [reading, setReading] = useState<SynastryReading | null>(null);
  const [streamParagraph, setStreamParagraph] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!blueprint) {
      router.replace('/onboarding');
      return;
    }
    setPartners(listPartners());
    // Cross-tab sync
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === 'liraydhas.partners.v1') {
        setPartners(listPartners());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [hydrated, blueprint, router]);

  // The selected partner.
  const partner = useMemo(
    () => partners.find((p) => p.id === selected) ?? null,
    [partners, selected],
  );

  // Fetch reading whenever selected changes.
  useEffect(() => {
    if (!partner || !blueprint) {
      setReading(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setReading(null);
    setStreamParagraph('');
    (async () => {
      try {
        const res = await fetch(api('/api/synastry?stream=1'), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            self: blueprint,
            other: partner.blueprint,
            selfName: 'you',
            otherName: partner.name,
            relation: partner.relation,
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error ?? `error ${res.status}`);
        }
        if (!isEventStream(res)) {
          const data = (await res.json()) as SynastryReading;
          if (cancelled) return;
          setReading(data);
          return;
        }
        // Streaming: hold aspects/electricChannels/lifeStage from the
        // meta event so we can compose the final SynastryReading on
        // done. Paragraph deltas stream live into setStreamParagraph.
        let meta: {
          aspects?: SynastryReading['aspects'];
          electricChannels?: SynastryReading['electricChannels'];
          lifeStage?: SynastryReading['lifeStage'];
          generatedAt?: string;
        } = {};
        let softError: string | null = null;
        await readSseStream(res, {
          meta: (m) => { meta = m as typeof meta; },
          paragraph: (_d, full) => { if (!cancelled) setStreamParagraph(full); },
          done: ({ paragraph }) => {
            if (cancelled) return;
            setReading({
              paragraph,
              aspects: meta.aspects ?? [],
              electricChannels: meta.electricChannels ?? [],
              lifeStage: meta.lifeStage ?? {
                ageA: 0, ageB: 0, ageGapYears: 0,
                chapterA: null, chapterB: null,
                sameChapter: false, risingA: 0, risingB: 0,
              },
              generatedAt: meta.generatedAt ?? new Date().toISOString(),
            });
            setStreamParagraph('');
          },
          error: (msg) => { softError = msg; },
        });
        if (softError && !cancelled) setError(friendlyError(softError));
      } catch (e) {
        if (cancelled) return;
        setError(friendlyError(e instanceof Error ? e.message : null));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [partner, blueprint]);

  if (!hydrated) {
    return (
      <main className="page flex items-center justify-center min-h-screen">
        <p className="caps small-label text-ink-faint">liraydhas</p>
      </main>
    );
  }
  if (!blueprint) return null;

  return (
    <main className="page max-w-md mx-auto fade-in">
      <header className="pb-6">
        <p className="small-label caps">Compatibility</p>
        <h1 className="h-display serif mt-3">Two charts, two lives.</h1>
        <FirstTimeIntro
          storeKey="liraydhas.compat.intro.dismissed.v1"
          learnHref="/learn"
        >
          <p>
            Add anyone whose chart you want alongside your own — partner,
            child, parent, friend. The reading you get back is not only
            about how the charts meet: it includes WHERE each of you is
            in your own life right now, because the same connection lands
            differently when one of you is approaching a Saturn return and
            the other is mid-Chiron.
          </p>
          <p>
            Charts you add live only on your device. There is no
            connecting, no inviting, no sharing.
          </p>
        </FirstTimeIntro>
      </header>

      <ProGate
        feature="Compatibility pairs two charts AND the moment each person is in their own life. Add as many partners as you want."
        features={[
          'Add partner, family, friend, ex, colleague — anyone whose chart you want next to yours.',
          'Cross-chart aspects, electric channels that complete only between you, plus the life-stage context that changes how the connection lands.',
          'Each partner reading regenerates on demand.',
          'Partners live only on your device — no sharing, no inviting.',
        ]}
      >

      {/* Partner list */}
      {partners.length > 0 && !showAdd && (
        <section className="mb-6 space-y-2">
          {partners.map((p) => {
            const isSelected = p.id === selected;
            const age = ageInYears(p.blueprint.birth.iso);
            const ch = currentChapter(age);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  hapticTap('light');
                  setSelected(isSelected ? null : p.id);
                }}
                className={`w-full text-left border-l-2 pl-3 py-2 transition-colors ${
                  isSelected ? 'border-accent bg-accent/5' : 'border-hairline hover:border-ink-faint'
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="serif text-[15px] text-ink">
                    {p.name}
                    {p.relation && (
                      <span
                        className="small-label caps text-ink-faint text-[10px] ml-2"
                        style={{ letterSpacing: '0.14em' }}
                      >
                        · {p.relation}
                      </span>
                    )}
                  </p>
                  <span
                    className="small-label caps text-ink-faint text-[10px] tabular-nums shrink-0"
                    style={{ letterSpacing: '0.14em' }}
                  >
                    age {age.toFixed(0)}
                  </span>
                </div>
                {ch && (
                  <p
                    className="small-label caps text-ink-faint text-[10px] mt-1"
                    style={{ letterSpacing: '0.14em' }}
                  >
                    in {ch.label.toLowerCase()}
                  </p>
                )}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => { hapticTap('light'); setShowAdd(true); setSelected(null); setReading(null); }}
            className="small-label caps text-ink-faint hover:text-ink mt-3"
            style={{ letterSpacing: '0.16em' }}
          >
            + add another person
          </button>
        </section>
      )}

      {/* Empty state intro before the form on a fresh install */}
      {partners.length === 0 && !showAdd && (
        <section className="border-l-2 border-hairline pl-4 py-3 mb-4">
          <p
            className="small-label caps text-accent mb-2"
            style={{ letterSpacing: '0.18em' }}
          >
            no one here yet
          </p>
          <p className="serif text-ink-dim text-[14px] leading-relaxed">
            Add someone&apos;s birth data to see how your two charts
            meet — and how that meeting lands given where each of you
            is in your own life right now.
          </p>
        </section>
      )}

      {/* Add-partner form */}
      {(showAdd || partners.length === 0) && (
        <AddPartnerForm
          onCancel={partners.length > 0 ? () => setShowAdd(false) : null}
          onAdded={(p) => {
            setPartners(listPartners());
            setShowAdd(false);
            setSelected(p.id);
            hapticSuccess();
          }}
        />
      )}

      {/* Selected partner reading */}
      {partner && reading && (
        <section className="mt-8 space-y-4">
          <p
            className="small-label caps text-accent"
            style={{ letterSpacing: '0.18em' }}
          >
            you and {partner.name.toLowerCase()}
          </p>

          {/* Life-stage strip */}
          <div className="border border-hairline p-3 grid grid-cols-2 gap-4 text-[12px]">
            <div>
              <p
                className="small-label caps text-ink-faint mb-1"
                style={{ letterSpacing: '0.16em' }}
              >
                you
              </p>
              <p className="serif text-ink">
                age {reading.lifeStage.ageA.toFixed(0)}
              </p>
              {reading.lifeStage.chapterA && (
                <p className="text-ink-dim text-[11px] mt-1">
                  {reading.lifeStage.chapterA.toLowerCase()}
                </p>
              )}
              <p className="small-label caps text-ink-faint text-[10px] mt-1 tabular-nums" style={{ letterSpacing: '0.14em' }}>
                {reading.lifeStage.risingA}↑ {7 - reading.lifeStage.risingA}↓
              </p>
            </div>
            <div>
              <p
                className="small-label caps text-ink-faint mb-1"
                style={{ letterSpacing: '0.16em' }}
              >
                {partner.name.toLowerCase()}
              </p>
              <p className="serif text-ink">
                age {reading.lifeStage.ageB.toFixed(0)}
              </p>
              {reading.lifeStage.chapterB && (
                <p className="text-ink-dim text-[11px] mt-1">
                  {reading.lifeStage.chapterB.toLowerCase()}
                </p>
              )}
              <p className="small-label caps text-ink-faint text-[10px] mt-1 tabular-nums" style={{ letterSpacing: '0.14em' }}>
                {reading.lifeStage.risingB}↑ {7 - reading.lifeStage.risingB}↓
              </p>
            </div>
            {reading.lifeStage.sameChapter && (
              <p
                className="col-span-2 small-label caps text-accent text-[10px] pt-1 border-t border-hairline"
                style={{ letterSpacing: '0.16em' }}
              >
                same chapter · {reading.lifeStage.ageGapYears}y apart
              </p>
            )}
            {!reading.lifeStage.sameChapter && (
              <p
                className="col-span-2 small-label caps text-ink-faint text-[10px] pt-1 border-t border-hairline"
                style={{ letterSpacing: '0.16em' }}
              >
                different chapters · {reading.lifeStage.ageGapYears}y apart
              </p>
            )}
          </div>

          <p className="body-prose serif text-ink">
            {reading.paragraph}
          </p>

          {/* Aspects */}
          {reading.aspects.length > 0 && (
            <section>
              <p className="small-label caps mb-2">how your charts meet</p>
              <ul className="space-y-2">
                {reading.aspects.slice(0, 5).map((a, i) => (
                  <li
                    key={i}
                    className="border-b border-hairline pb-2"
                  >
                    <div className="flex justify-between items-baseline text-[12.5px]">
                      <span className="text-ink-dim">
                        your {a.aBody} {a.kind} their {a.bBody}
                      </span>
                      <span className="text-ink-faint tabular-nums">
                        {a.orb.toFixed(1)}°
                      </span>
                    </div>
                    <p className="serif text-[12.5px] text-ink-faint mt-1 leading-relaxed">
                      {natalAspectMeaning(a.aBody, a.bBody, a.kind)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Electric channels */}
          {reading.electricChannels.length > 0 && (
            <section>
              <p className="small-label caps mb-2">what completes between you</p>
              <ul className="space-y-1">
                {reading.electricChannels.map((c, i) => (
                  <li
                    key={i}
                    className="text-[12.5px] border-b border-hairline py-1"
                  >
                    <span className="text-ink">{c.name}</span>{' '}
                    <span className="text-ink-faint">
                      · you {c.ownership.a?.gate} / them {c.ownership.b?.gate}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-ink-faint italic mt-2 leading-relaxed">
                neither of you carries this current alone. you complete it together — each holds one half of a channel that lights up only when you're connected.
              </p>
            </section>
          )}

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                if (!confirm(`Remove ${partner.name} from compatibility?`)) return;
                hapticTap('light');
                removePartner(partner.id);
                setPartners(listPartners());
                setSelected(null);
                setReading(null);
              }}
              className="small-label caps text-ink-faint hover:text-accent"
              style={{ letterSpacing: '0.16em' }}
            >
              remove
            </button>
          </div>
        </section>
      )}

      {partner && loading && !streamParagraph && (
        <section className="mt-8">
          <p className="small-label caps text-ink-faint mb-3" style={{ letterSpacing: '0.18em' }}>
            composing the reading
          </p>
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-hairline w-11/12" />
            <div className="h-4 bg-hairline w-10/12" />
            <div className="h-4 bg-hairline w-9/12" />
            <div className="h-4 bg-hairline w-8/12" />
          </div>
        </section>
      )}

      {partner && streamParagraph && !reading && (
        <section className="mt-8">
          <p className="body-prose serif text-ink">
            {streamParagraph}
            <span className="stream-cursor" aria-hidden>▎</span>
          </p>
        </section>
      )}

      {partner && error && (
        <section className="mt-8 border border-hairline p-3">
          <p className="text-accent text-[13px]">{error}</p>
          <button
            className="btn-ghost mt-2"
            onClick={() => { hapticTap('light'); setSelected(null); setTimeout(() => setSelected(partner.id), 0); }}
          >
            try again
          </button>
        </section>
      )}

      </ProGate>

      <section className="mt-12 space-y-2">
        <Link href="/today" className="btn-ghost block">today →</Link>
        <Link href="/about" className="btn-ghost block">about →</Link>
      </section>
    </main>
  );
}

function AddPartnerForm({
  onCancel,
  onAdded,
}: {
  onCancel: (() => void) | null;
  onAdded: (p: SavedPartner) => void;
}) {
  const [name, setName] = useState('');
  const [relation, setRelation] = useState<string>('partner');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [placeQuery, setPlaceQuery] = useState('');
  const [picked, setPicked] = useState<{ r: GeocodeResult; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const maxDate = localDateStr();

  const canSubmit =
    name.trim().length > 0 &&
    date.length === 10 &&
    (timeUnknown || time.length >= 4) &&
    !!picked;

  async function submit() {
    setErr(null);
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
      const added = addPartner({
        name: name.trim(),
        blueprint: bp,
        relation: relation || undefined,
      });
      onAdded(added);
    } catch (e: unknown) {
      setErr(friendlyError(e instanceof Error ? e.message : null));
      hapticWarn();
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 border border-hairline p-4">
      <p
        className="small-label caps text-accent"
        style={{ letterSpacing: '0.18em' }}
      >
        add someone
      </p>
      <label className="block">
        <span
          className="small-label caps text-ink-faint text-[10px] block mb-1"
          style={{ letterSpacing: '0.16em' }}
        >
          name
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="first name only is fine"
          className="w-full bg-bg border border-hairline p-2 text-[13.5px] text-ink serif"
        />
      </label>
      <label className="block">
        <span
          className="small-label caps text-ink-faint text-[10px] block mb-1"
          style={{ letterSpacing: '0.16em' }}
        >
          relation
        </span>
        <select
          value={relation}
          onChange={(e) => setRelation(e.currentTarget.value)}
          className="bg-bg border border-hairline px-2 py-1 text-[13px] text-ink"
        >
          {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </label>
      <label className="block">
        <span
          className="small-label caps text-ink-faint text-[10px] block mb-1"
          style={{ letterSpacing: '0.16em' }}
        >
          birth date
        </span>
        <input
          type="date"
          value={date}
          max={maxDate}
          onChange={(e) => setDate(e.currentTarget.value)}
          className="bg-bg border border-hairline px-2 py-1 text-[13.5px] text-ink"
        />
      </label>
      <label className="block">
        <span
          className="small-label caps text-ink-faint text-[10px] block mb-1"
          style={{ letterSpacing: '0.16em' }}
        >
          birth time {timeUnknown && <em>(unknown — using noon)</em>}
        </span>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.currentTarget.value)}
          disabled={timeUnknown}
          className="bg-bg border border-hairline px-2 py-1 text-[13.5px] text-ink disabled:opacity-40"
        />
        <label className="flex items-center gap-2 mt-2 text-[12px] text-ink-dim cursor-pointer">
          <input
            type="checkbox"
            checked={timeUnknown}
            onChange={(e) => setTimeUnknown(e.currentTarget.checked)}
            className="accent-accent"
          />
          birth time unknown
        </label>
      </label>
      <label className="block">
        <span
          className="small-label caps text-ink-faint text-[10px] block mb-1"
          style={{ letterSpacing: '0.16em' }}
        >
          birth place
        </span>
        <PlaceAutocomplete
          value={placeQuery}
          onChange={setPlaceQuery}
          onPick={(r, label) => {
            setPlaceQuery(label);
            setPicked({ r, label });
          }}
        />
      </label>
      {err && (
        <p className="text-accent text-[12.5px]">{err}</p>
      )}
      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit || busy}
          className="btn-ghost"
        >
          {busy ? 'adding…' : 'add'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="small-label caps text-ink-faint hover:text-ink"
            style={{ letterSpacing: '0.16em' }}
          >
            cancel
          </button>
        )}
      </div>
    </section>
  );
}
