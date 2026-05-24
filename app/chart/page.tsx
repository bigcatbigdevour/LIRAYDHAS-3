'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import BodyGraph from '@/components/BodyGraph';
import NatalWheel from '@/components/NatalWheel';

export default function ChartPage() {
  const router = useRouter();
  const blueprint = useStore((s) => s.blueprint);
  const reset = useStore((s) => s.reset);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!blueprint) router.replace('/onboarding');
    }, 60);
    return () => clearTimeout(t);
  }, [blueprint, router]);

  if (!blueprint) return null;
  const hd = blueprint.humanDesign;
  const n = blueprint.natal;

  return (
    <main className="page max-w-md mx-auto fade-in">
      <header className="pb-6">
        <p className="small-label caps">Your design</p>
        <h1 className="h-display serif mt-3">
          {hd.type}.
        </h1>
        <p className="text-ink-dim text-[13px] mt-2 italic">
          Born {new Date(blueprint.birth.iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: blueprint.birth.timeUnknown ? undefined : 'short' })} · {blueprint.birth.place}
        </p>
        {blueprint.birth.timeUnknown && (
          <p className="text-accent text-[11px] mt-2 caps" style={{ letterSpacing: '0.18em' }}>
            Birth time unknown — profile and houses are soft
          </p>
        )}
      </header>

      <section className="my-6">
        <BodyGraph blueprint={blueprint} />
      </section>

      <dl className="grid grid-cols-2 gap-y-3 gap-x-4 mt-8 border-t border-hairline pt-4 text-[13px]">
        <Row k="Type"        v={hd.type} />
        <Row k="Strategy"    v={hd.strategy} />
        <Row k="Authority"   v={hd.authority} />
        <Row k="Profile"     v={hd.profile} />
        <Row k="Definition"  v={hd.definition} />
        <Row k="Cross"       v={hd.incarnationCross} />
      </dl>

      <section className="mt-12">
        <p className="small-label caps mb-2">natal sky</p>
        <NatalWheel blueprint={blueprint} />
        <ul className="mt-4 grid grid-cols-2 gap-y-1 text-[13px] text-ink-dim">
          <Placement label="Sun" pos={n.sun} />
          <Placement label="Moon" pos={n.moon} />
          <Placement label="Mercury" pos={n.mercury} />
          <Placement label="Venus" pos={n.venus} />
          <Placement label="Mars" pos={n.mars} />
          <Placement label="Jupiter" pos={n.jupiter} />
          <Placement label="Saturn" pos={n.saturn} />
          {n.asc !== null && (
            <li className="flex justify-between border-b border-hairline py-1">
              <span className="text-ink">Rising</span>
              <span className="tabular-nums">{signFromLon(n.asc)} {(n.asc % 30).toFixed(1)}°</span>
            </li>
          )}
        </ul>
      </section>

      <section className="mt-12">
        <button
          className="btn-ghost"
          onClick={() => {
            if (confirm('Erase your blueprint and start over?')) {
              reset();
              router.replace('/onboarding');
            }
          }}
        >
          erase and start over
        </button>
      </section>
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="small-label caps">{k}</dt>
      <dd className="text-right">{v}</dd>
    </>
  );
}

function Placement({
  label,
  pos,
}: {
  label: string;
  pos: { sign: string; degree: number; gate: number; line: number };
}) {
  return (
    <li className="flex justify-between border-b border-hairline py-1">
      <span className="text-ink">{label}</span>
      <span className="tabular-nums">
        {pos.sign} {pos.degree.toFixed(1)}° · {pos.gate}.{pos.line}
      </span>
    </li>
  );
}

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];
function signFromLon(lon: number): string {
  const n = ((lon % 360) + 360) % 360;
  return SIGNS[Math.floor(n / 30)];
}
