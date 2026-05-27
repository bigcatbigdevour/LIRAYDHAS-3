'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import ArcDiagram, { type ArcSelection } from '@/components/ArcDiagram';
import ScrollHint from '@/components/ScrollHint';
import { CYCLES, ageInYears } from '@/lib/cycles';
import { CYCLE_LENSES, arcDescription } from '@/lib/cycleLenses';
import { LIFE_STATIONS } from '@/lib/lifeStations';

export default function ArcsPage() {
  const router = useRouter();
  const blueprint = useStore((s) => s.blueprint);
  const [selected, setSelected] = useState<ArcSelection | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { if (!blueprint) router.replace('/onboarding'); }, 60);
    return () => clearTimeout(t);
  }, [blueprint, router]);

  if (!blueprint) return null;

  const age = ageInYears(blueprint.birth.iso);

  return (
    <main className="page max-w-3xl mx-auto fade-in">
      <header className="pb-6">
        <p className="small-label caps">Arcs</p>
        <h1 className="h-display serif mt-3">Every cycle, drawn.</h1>
        <p className="serif text-[15px] text-ink-dim mt-3 leading-relaxed max-w-xl">
          Most astrology gives you a snapshot. This gives you the shape of
          your whole life. Seven cycles — Solar, Mars, Jupiter, Saturn,
          Nodal, Chiron, the Progressed Moon — drawn end to end from age
          zero to eighty-five. The brighter arcs are the ones you are
          currently inside. The white line is right now.
        </p>
        <p className="text-ink-dim text-[13px] mt-3 max-w-md">
          <span className="text-ink">Tap any arc</span> to read what that
          specific period holds.
        </p>
      </header>

      <section className="mt-6">
        <ArcDiagram
          birthIso={blueprint.birth.iso}
          selected={selected}
          onSelect={setSelected}
        />
        {!selected && <ScrollHint label="tap an arc · or scroll" />}
      </section>

      {/* Detail panel — what does the selected arc mean */}
      {selected && (
        <section className="mt-8 border border-hairline p-4 fade-in">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3" style={{ background: selected.color }} />
              <span className="small-label caps">{selected.cycleLabel}</span>
            </div>
            <span className="small-label caps text-ink-faint">
              ages {selected.ageStart.toFixed(1)} – {selected.ageEnd.toFixed(1)}
            </span>
          </div>
          <p className="body-prose serif text-ink whitespace-pre-line mt-2">
            {arcDescription({
              cycle: CYCLES.find((c) => c.key === selected.cycleKey)!,
              nthCycle: selected.nthCycle,
              ageStart: selected.ageStart,
              ageEnd: selected.ageEnd,
            })}
          </p>
          {age >= selected.ageStart && age < selected.ageEnd && (
            <p className="small-label caps mt-3 text-accent">you are inside this arc right now</p>
          )}
        </section>
      )}

      {/* Always-visible legend / key */}
      <section className="mt-12">
        <h2 className="h-display serif mb-3" style={{ fontSize: '1.5rem' }}>
          How to read this chart.
        </h2>
        <ul className="space-y-2 text-[13.5px] text-ink-dim serif">
          <li>
            <span className="text-ink">The bottom line</span> is your life,
            ages 0 to 85, left to right.
          </li>
          <li>
            <span className="text-ink">Each tick</span> on the bottom line is
            a moment when a cycle returns to where it started.
          </li>
          <li>
            <span className="text-ink">Each curved arc</span> connects two
            consecutive returns of the same cycle — one full period of that
            cycle.
          </li>
          <li>
            <span className="text-ink">Each color</span> is a different cycle.
            The slower the cycle, the wider its arcs.
          </li>
          <li>
            <span className="text-ink">The vertical white line</span> is today.
            It is where you are inside every cycle at once.
          </li>
        </ul>
      </section>

      {/* Convergence stations — ages where multiple cycles align */}
      <section className="mt-12">
        <h2 className="h-display serif mb-2" style={{ fontSize: '1.5rem' }}>
          Where the cycles converge.
        </h2>
        <p className="text-ink-dim text-[13.5px] serif leading-relaxed mb-4">
          Certain ages feel universal — adolescence at twelve, the Saturn
          return at twenty-nine, midlife around forty-five. These are not
          arbitrary. They are the points where multiple cycles cross at the
          same place on the timeline above. The "everyone goes through this"
          moments are when the math literally stacks.
        </p>
        <ul className="space-y-5">
          {LIFE_STATIONS.map((s) => {
            const isHere = Math.abs(age - s.age) < 2;
            const isPast = age > s.age + 1;
            return (
              <li key={s.age} className="border-l border-hairline pl-3">
                <div className="flex items-baseline justify-between">
                  <p className="serif text-[16px] text-ink">
                    {s.label}
                  </p>
                  <span className={`small-label caps ${isHere ? 'text-accent' : isPast ? 'text-ink-faint' : 'text-ink-dim'}`}>
                    age {s.age}
                    {isHere && ' · you'}
                    {isPast && ' · past'}
                  </span>
                </div>
                <p className="text-[11.5px] text-ink-faint caps mt-0.5" style={{ letterSpacing: '0.08em' }}>
                  {s.convergence}
                </p>
                <p className="text-[14px] text-ink-dim serif mt-1 leading-relaxed">
                  {s.description}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Cycle-by-cycle multi-lens guide */}
      <section className="mt-16 space-y-10">
        <h2 className="h-display serif" style={{ fontSize: '1.5rem' }}>
          Each cycle, four ways.
        </h2>
        {CYCLES.map((c) => {
          const lens = CYCLE_LENSES[c.key];
          if (!lens) return null;
          return (
            <article key={c.key}>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block w-4 h-px" style={{ background: c.color }} />
                <h3 className="serif text-[19px] text-ink">{c.label}</h3>
                <span className="small-label caps text-ink-faint ml-1">
                  every {c.yearLength.toFixed(2)}y
                </span>
              </div>
              <dl className="space-y-3">
                <Lens k="Astrologically" v={lens.astrological} />
                <Lens k="Psychologically" v={lens.psychological} />
                <Lens k="In mundane life" v={lens.mundane} />
                <Lens k="As a story" v={lens.mythic} />
              </dl>
            </article>
          );
        })}
      </section>
    </main>
  );
}

function Lens({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="small-label caps text-ink-faint">{k}</dt>
      <dd className="serif text-[14px] text-ink-dim mt-0.5 leading-relaxed">{v}</dd>
    </div>
  );
}
