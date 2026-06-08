'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { fullOverviewText } from '@/lib/fullOverview';

export default function AboutPage() {
  const router = useRouter();
  const blueprint = useStore((s) => s.blueprint);
  const reset = useStore((s) => s.reset);

  return (
    <main className="page max-w-md mx-auto fade-in">
      <header className="pb-6">
        <p className="small-label caps">about</p>
        <h1 className="h-display serif mt-3">What this is.</h1>
      </header>

      <section className="space-y-4 body-prose serif text-ink-dim">
        <p>
          Liraydhas is a daily reading of two systems at once: tropical
          astrology and Human Design. Both are computed from your exact birth
          moment and your exact birth location.
        </p>
        <p>
          The math runs on your phone. The daily paragraph is written by a
          language model fed your tightest current transits and the bare
          outline of your design — sent over once per day. Your blueprint
          itself lives only in this browser. Erase the app and it's gone.
        </p>
      </section>

      <h2 className="h-display serif mt-12 mb-3" style={{ fontSize: '1.5rem' }}>The four tabs.</h2>
      <dl className="space-y-3 text-[14px]">
        <Item k="Today" v="One short paragraph from the live transits, your current sky, and a recap of the past week." />
        <Item k="Arcs"  v="Every cycle that returns over a human lifespan, drawn end to end. Solar, Mars, Jupiter, Saturn, Nodal, Chiron, Progressed Moon." />
        <Item k="Polarity" v="Whether each of those cycles is currently rising or descending. The stack reads as one weather." />
        <Item k="Chart" v="Your Human Design bodygraph, the 26 activations that produced it, and your natal astrology wheel." />
      </dl>

      <h2 className="h-display serif mt-12 mb-3" style={{ fontSize: '1.5rem' }}>Aspects, briefly.</h2>
      <dl className="space-y-2 text-[13px]">
        <Item k="conjunction" v="Same place. Two planets fused — their themes merge." />
        <Item k="sextile" v="60° apart. A small flow, an open door." />
        <Item k="square" v="90° apart. Tension. The kind of friction that produces growth." />
        <Item k="trine" v="120° apart. Easy. Maybe too easy." />
        <Item k="opposition" v="180° apart. A see-saw. Two themes pulling against each other across your chart." />
      </dl>

      <h2 className="h-display serif mt-12 mb-3" style={{ fontSize: '1.5rem' }}>Human Design, briefly.</h2>
      <p className="text-[14px] text-ink-dim serif leading-relaxed">
        Two charts are computed: one at the moment of birth (the Personality,
        right side, in white), one at the moment when the Sun was exactly 88°
        of ecliptic longitude earlier (the Design, left side, in red). Each
        chart contributes 13 activations — Sun, Earth, Moon, North &amp; South
        Nodes, and the seven planets — totalling 26. Each activation maps to
        one of 64 gates. A center is defined when both gates of a channel
        terminating in it are activated. Type, authority, and profile fall
        out of which centers and lines are lit.
      </p>

      <h2 className="h-display serif mt-12 mb-3" style={{ fontSize: '1.5rem' }}>Polarity, briefly.</h2>
      <p className="text-[14px] text-ink-dim serif leading-relaxed">
        Every cycle has two halves. The first half is <em>rising</em> —
        building, accumulating, opening. The second half is{' '}
        <em>descending</em> — completing, releasing, integrating. Most
        people live their whole lives inside these tides without noticing
        when they flip. The Polarity tab shows the flip dates for every
        cycle and tells you, right now, how many are rising vs descending.
      </p>
      <p className="text-[14px] text-ink-dim serif leading-relaxed mt-3">
        A "stack" of mostly rising cycles tends to feel like an opening
        season of life; mostly descending feels like a releasing one.
        Recent flips in the slower cycles — Saturn, Chiron, Nodal — are
        rarely subtle. Watch those.
      </p>

      <h2 className="h-display serif mt-12 mb-3" style={{ fontSize: '1.5rem' }}>Stations, briefly.</h2>
      <p className="text-[14px] text-ink-dim serif leading-relaxed">
        Some ages feel universal — adolescence at twelve, the Saturn return
        at twenty-nine, midlife around forty-five, the Chiron return at
        fifty. These are points where multiple cycles cross at the same
        place on the timeline. "Everyone goes through this at X" is the
        math literally stacking. The Arcs tab marks fourteen of these
        stations with diamonds on the chart and explains each one.
      </p>

      <h2 className="h-display serif mt-12 mb-3" style={{ fontSize: '1.5rem' }}>The seven cycles.</h2>
      <dl className="space-y-2 text-[13px]">
        <Item k="Solar return" v="Every year. The annual reset, birthday to birthday." />
        <Item k="Mars synodic" v="Every 2.135 years. Action and friction. What you are fighting for." />
        <Item k="Jupiter return" v="Every 11.86 years. Expansion. What you trust the world to give." />
        <Item k="Nodal return" v="Every 18.6 years. Direction. The pull of fate." />
        <Item k="Progressed lunar" v="Every 27.3 years (in 12 phases). Inner emotional weather slowed down." />
        <Item k="Saturn return" v="Every 29.5 years. Structure and consequence. Reckonings at ~29 and ~59." />
        <Item k="Chiron return" v="Every 50.4 years. The original wound and the original teacher. Once a lifetime." />
      </dl>

      <h2 className="h-display serif mt-12 mb-3" style={{ fontSize: '1.5rem' }}>Settings.</h2>
      <div className="space-y-3">
        <Link href="/chart" className="btn-ghost block">go to your chart →</Link>
        <Link href="/year" className="btn-ghost block">your year ahead →</Link>
        <Link href="/learn" className="btn-ghost block">learn the system →</Link>
        <Link href="/onboarding?edit=1" className="btn-ghost block">edit my birth data →</Link>
        <Link href="/privacy" className="btn-ghost block">privacy →</Link>
        {blueprint && (
          <button
            className="btn-ghost text-left"
            onClick={async () => {
              const txt = fullOverviewText(blueprint);
              try {
                if (navigator.share) await navigator.share({ title: 'My blueprint', text: txt });
                else {
                  await navigator.clipboard.writeText(txt);
                  const el = document.getElementById('overview-toast');
                  if (el) { el.style.opacity = '1'; window.setTimeout(() => { el.style.opacity = '0'; }, 1500); }
                }
              } catch {/* cancelled */}
            }}
          >
            export full overview (text)
          </button>
        )}
        <div id="overview-toast" className="small-label caps text-accent text-right" style={{ opacity: 0, transition: 'opacity 300ms ease', height: '1em' }}>copied</div>
        {blueprint && (
          <button
            className="btn-ghost"
            onClick={() => {
              if (confirm('Erase your blueprint and start over?')) {
                reset();
                router.replace('/onboarding');
              }
            }}
          >
            erase blueprint
          </button>
        )}
      </div>
    </main>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div className="border-b border-hairline pb-2">
      <dt className="small-label caps">{k}</dt>
      <dd className="text-ink-dim mt-0.5 serif">{v}</dd>
    </div>
  );
}
