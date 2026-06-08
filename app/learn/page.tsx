'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TYPE_DESCRIPTIONS, AUTHORITY_DESCRIPTIONS } from '@/lib/humandesign/interpretations';
import { CENTER_MEANINGS } from '@/lib/humandesign/centerMeanings';
import { CYCLES } from '@/lib/cycles';

// Light-weight collapsible — no library, no animation lib, just a button
// + a div. Each section is independently expandable so a beginner can dip
// into one topic without scrolling past a wall of text.
function Collapse({
  title,
  subtitle,
  children,
  defaultOpen = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-hairline py-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left flex items-baseline justify-between gap-3"
      >
        <div>
          <p className="serif text-[17px] text-ink">{title}</p>
          {subtitle && (
            <p className="text-[12px] text-ink-faint mt-0.5">{subtitle}</p>
          )}
        </div>
        <span className="small-label caps text-ink-faint shrink-0" aria-hidden>
          {open ? '−' : '+'}
        </span>
      </button>
      {open && (
        <div className="mt-3 space-y-3 text-[14px] text-ink-dim serif leading-relaxed fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

function Term({ name, def }: { name: string; def: string }) {
  return (
    <div className="border-l border-hairline pl-3 py-1">
      <p className="small-label caps text-ink-faint" style={{ letterSpacing: '0.14em' }}>
        {name}
      </p>
      <p className="text-[13.5px] text-ink-dim serif mt-1 leading-relaxed">{def}</p>
    </div>
  );
}

export default function LearnPage() {
  return (
    <main className="page max-w-md mx-auto fade-in">
      <header className="pb-6">
        <p className="small-label caps">Learn</p>
        <h1 className="h-display serif mt-3">What this app is reading.</h1>
        <p className="text-ink-dim text-[14px] mt-3 leading-relaxed serif">
          Two ancient systems and one modern visualization, computed from
          your exact birth moment. None of it is magic — all of it is math
          and centuries-old interpretive language. This page explains every
          piece, in plain English, in the order it shows up in the app.
        </p>
      </header>

      <nav className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[10px] caps text-ink-faint border-t border-b border-hairline py-1.5" style={{ letterSpacing: '0.12em' }}>
        <a href="#astrology" className="hover:text-ink">astrology</a>
        <a href="#hd" className="hover:text-ink">human design</a>
        <a href="#cycles" className="hover:text-ink">cycles</a>
        <a href="#polarity" className="hover:text-ink">polarity</a>
        <a href="#math" className="hover:text-ink">the math</a>
      </nav>

      {/* === ASTROLOGY === */}
      <section id="astrology" className="mt-10 scroll-mt-4">
        <h2 className="h-display serif mb-2" style={{ fontSize: '1.6rem' }}>
          Astrology.
        </h2>
        <p className="text-[14px] text-ink-dim serif leading-relaxed mb-4">
          A natal chart is the sky at the exact moment you were born, drawn
          as a circle. Earth is in the middle. The ring is split into
          twelve 30° slices (the zodiac signs). Each planet's position in
          the ring tells a story about a different part of your psyche.
        </p>

        <Collapse title="The natal chart" subtitle="what the wheel actually shows">
          <p>
            Imagine standing outside the moment of your birth and looking
            up. The planets are scattered across a 360° band of sky called
            the ecliptic — the same band the Sun travels through over the
            course of a year. Astrology projects all of it onto a flat
            circle, slices it into the twelve signs, and reads the
            geometry.
          </p>
          <p>
            The chart has four critical "angles" — Ascendant (rising sign,
            the eastern horizon), Descendant (western horizon), Midheaven
            (highest point), and IC (lowest point). The rising sign in
            particular is the "mask" — how you arrive in a room before you
            speak.
          </p>
        </Collapse>

        <Collapse title="The twelve signs" subtitle="each is a 30° slice of sky">
          <ul className="space-y-1.5">
            {SIGNS.map(([name, range, gist]) => (
              <li key={name} className="border-b border-hairline pb-1.5">
                <span className="serif text-ink text-[14px]">{name}</span>{' '}
                <span className="text-ink-faint small-label caps">{range}</span>
                <p className="text-[12.5px] text-ink-dim mt-0.5">{gist}</p>
              </li>
            ))}
          </ul>
        </Collapse>

        <Collapse title="The planets" subtitle="ten archetypes each governing a piece of you">
          <ul className="space-y-1.5">
            {PLANETS.map(([name, gov]) => (
              <li key={name} className="border-b border-hairline pb-1.5">
                <span className="serif text-ink text-[14px]">{name}</span>
                <p className="text-[12.5px] text-ink-dim mt-0.5">{gov}</p>
              </li>
            ))}
          </ul>
        </Collapse>

        <Collapse title="Aspects" subtitle="the angles between planets, and what they feel like">
          <p>
            When two planets sit at a meaningful angle from each other (a
            geometric relationship measured in degrees of the ring), they
            talk to each other. Five "major" aspects do most of the work:
          </p>
          <Term name="Conjunction · 0°" def="Same place. The two archetypes fuse. Intense, can be one-note." />
          <Term name="Sextile · 60°" def="A friendly tap. A small opening, an opportunity. Easy if used." />
          <Term name="Square · 90°" def="Tension. The two archetypes push on each other. The kind of friction that makes you grow up." />
          <Term name="Trine · 120°" def="An easy flow. A talent. So easy it's often taken for granted." />
          <Term name="Opposition · 180°" def="See-saw. The two archetypes pull against each other across the chart. The work is integration, not picking a side." />
        </Collapse>

        <Collapse title="Houses" subtitle="twelve life arenas, anchored to your birth location">
          <p>
            Once the wheel is drawn for your birth location and time, it
            gets divided into twelve "houses" — distinct life arenas. House
            1 starts at your Ascendant. A planet's house tells you{' '}
            <em>where</em> it shows up in your life (1st = self / 2nd =
            money & values / 7th = partnerships / 10th = career, etc.).
            Liraydhas uses Placidus houses, the most common system in
            Western astrology.
          </p>
        </Collapse>

        <Collapse title="Transits" subtitle="today's sky, hitting your natal chart">
          <p>
            Your natal chart is fixed at birth, but the planets keep
            moving. A "transit" is what today's sky is doing relative to
            your natal chart. When transiting Saturn squares your natal
            Sun, you'll know it. The Today tab pulls the three tightest
            transits to your chart each day and writes the reading around
            them.
          </p>
        </Collapse>
      </section>

      {/* === HUMAN DESIGN === */}
      <section id="hd" className="mt-12 scroll-mt-4">
        <h2 className="h-display serif mb-2" style={{ fontSize: '1.6rem' }}>
          Human Design.
        </h2>
        <p className="text-[14px] text-ink-dim serif leading-relaxed mb-4">
          A synthesis system that fuses astrology, the I-Ching, the Kabbalah's
          Tree of Life, and the Hindu-Brahmin chakra system. Two charts
          are computed: one at your birth moment (the{' '}
          <span className="text-ink">Personality</span>) and one when the
          Sun was exactly 88° earlier (the{' '}
          <span className="text-ink">Design</span>). The combination of
          the two produces a "bodygraph" — your energetic blueprint.
        </p>

        <Collapse
          title="Personality vs Design"
          subtitle="conscious you and unconscious you"
          defaultOpen
        >
          <p>
            The Personality chart is what you know about yourself — your
            self-image, the things you can describe. It's drawn from the
            sky at the moment you were born and rendered in{' '}
            <span className="text-ink">cream</span> in the bodygraph.
          </p>
          <p>
            The Design chart is what your body knows that your mind
            doesn't. It's computed from the moment when the Sun was
            exactly 88° of arc earlier — about three months before your
            birth — and rendered in{' '}
            <span className="text-accent">wine</span>. This is the layer
            other people often see in you before you see it yourself.
          </p>
          <p>
            Both charts together produce 26 "activations" (13 planets in
            each), and those 26 light up gates in the bodygraph.
          </p>
        </Collapse>

        <Collapse title="The five types" subtitle="how your energy is built to operate">
          {Object.entries(TYPE_DESCRIPTIONS).map(([type, desc]) => (
            <Term key={type} name={type} def={desc} />
          ))}
        </Collapse>

        <Collapse title="Authority" subtitle="how YOUR body says yes or no">
          <p>
            Your strategy says <em>how</em> to engage the world. Your
            authority says <em>how to decide</em> within that engagement.
            Authorities are derived from which centers are defined — there
            is a strict priority order:
          </p>
          {Object.entries(AUTHORITY_DESCRIPTIONS).map(([name, desc]) => (
            <Term key={name} name={name} def={desc} />
          ))}
        </Collapse>

        <Collapse title="The nine centers" subtitle="the geometric shapes in the bodygraph">
          <p>
            Each center has a fixed function. When a center is{' '}
            <span className="text-ink">defined</span> (filled in), it
            broadcasts that energy consistently. When it's{' '}
            <span className="text-ink-faint">undefined</span> (open), it
            absorbs and amplifies that energy from whoever's around you.
            Open centers are where you learn the most, and where you can
            also lose yourself.
          </p>
          {(Object.entries(CENTER_MEANINGS) as [string, { name: string; defined: string; undefined: string }][]).map(([key, m]) => (
            <div key={key} className="border-l border-hairline pl-3 py-1.5">
              <p className="small-label caps text-ink-faint" style={{ letterSpacing: '0.14em' }}>
                {m.name}
              </p>
              <p className="text-[13px] text-ink-dim mt-1 leading-relaxed">
                <span className="text-ink">Defined: </span>{m.defined}
              </p>
              <p className="text-[13px] text-ink-dim mt-1 leading-relaxed">
                <span className="text-ink-faint">Open: </span>{m.undefined}
              </p>
            </div>
          ))}
        </Collapse>

        <Collapse title="Gates and channels" subtitle="the dots and lines">
          <p>
            There are <span className="text-ink">64 gates</span>, one per
            I-Ching hexagram, arranged around the ecliptic. Each of your
            26 activations falls inside one gate. A gate is "lit" when at
            least one activation falls in it.
          </p>
          <p>
            There are <span className="text-ink">36 channels</span>, each
            connecting two specific gates across two centers. A channel is
            "defined" only when BOTH of its gates are lit in your chart —
            then it lights up the entire channel solid and defines both
            centers it connects.
          </p>
          <p>
            A "hanging gate" is one half of a channel — your gate is lit
            but your channel partner's isn't. You'll feel pulled to people
            who carry the complementary gate, because they'll temporarily
            complete the channel for you.
          </p>
        </Collapse>

        <Collapse title="Profile" subtitle="the line of your two Suns">
          <p>
            Each gate has six sub-divisions called "lines" (1 through 6).
            Your profile is read as{' '}
            <span className="text-ink">Personality Sun line / Design
            Sun line</span> — for example "5/1" (Heretic / Investigator)
            or "6/3" (Role Model / Martyr).
          </p>
          <p>
            The first number is the role you consciously play. The second
            is the foundation your body builds it on. There are 12 valid
            profiles, each with a recognizable personality archetype.
          </p>
        </Collapse>

        <Collapse title="Definition" subtitle="how your defined centers are wired together">
          <p>
            Look at all your defined centers as a graph: centers are
            nodes, channels are edges. The number of disconnected
            "islands" is your definition: <span className="text-ink">Single</span>{' '}
            (one island, everything connected), <span className="text-ink">Split</span>{' '}
            (two), <span className="text-ink">Triple Split</span> (three),
            or <span className="text-ink">Quadruple Split</span>{' '}
            (four). Splits affect how you experience your own decision
            process — splits often want external bridges (other people,
            environment) to feel whole.
          </p>
        </Collapse>

        <Collapse title="Incarnation Cross" subtitle="the four pillars of your life's purpose">
          <p>
            The four gates at your Personality Sun, Personality Earth,
            Design Sun, and Design Earth form your Incarnation Cross —
            the deepest theme of your lifetime. There are 192 named
            crosses. The cross isn't a "do this" prescription — it's the
            backdrop your decisions are made against.
          </p>
        </Collapse>
      </section>

      {/* === CYCLES === */}
      <section id="cycles" className="mt-12 scroll-mt-4">
        <h2 className="h-display serif mb-2" style={{ fontSize: '1.6rem' }}>
          Cycles.
        </h2>
        <p className="text-[14px] text-ink-dim serif leading-relaxed mb-4">
          Each planet takes a different amount of time to orbit the Sun (or,
          for the Moon, the Earth). When a planet returns to the exact
          position it was at when you were born, that's a "return" — and
          returns reliably correspond to recognizable life stages.
        </p>

        <Collapse title="The seven cycles Liraydhas tracks" defaultOpen>
          {CYCLES.map((c) => (
            <div key={c.key} className="border-l pl-3 py-1.5" style={{ borderColor: c.color }}>
              <p className="serif text-[14px] text-ink">
                {c.label} <span className="text-ink-faint small-label caps ml-1">every {c.yearLength.toFixed(2)}y</span>
              </p>
              <p className="text-[12.5px] text-ink-dim mt-0.5 leading-relaxed">
                {c.description}
              </p>
            </div>
          ))}
        </Collapse>

        <Collapse title="Returns and stations" subtitle="why everyone hits the same walls at the same ages">
          <p>
            A "return" is when a planet finishes one full orbit since your
            birth. The most famous: the <span className="text-ink">Saturn
            return</span> at age ~29 (and ~59), where the structures of
            your life get a serious audit. The <span className="text-ink">
            Chiron return</span> at ~50 is once a lifetime — the deep
            wound becoming the deep teaching.
          </p>
          <p>
            "Stations" are the named ages where multiple cycles converge
            on the same point of the timeline. Twelve (your first Jupiter
            return + early adolescence), twenty-nine, forty-five, fifty,
            fifty-nine — these aren't superstition. They're where the math
            literally stacks.
          </p>
        </Collapse>
      </section>

      {/* === POLARITY === */}
      <section id="polarity" className="mt-12 scroll-mt-4">
        <h2 className="h-display serif mb-2" style={{ fontSize: '1.6rem' }}>
          Polarity.
        </h2>
        <p className="text-[14px] text-ink-dim serif leading-relaxed mb-4">
          Every cycle has two halves. The first half is{' '}
          <span className="text-ink">rising</span> — energy building,
          things accumulating, doors opening. The second half is{' '}
          <span className="text-ink">descending</span> — things completing,
          releasing, integrating. Most people live their whole lives
          inside these tides without ever noticing when one flips.
        </p>

        <Collapse title="Reading your polarity stack" defaultOpen>
          <p>
            Add up which of your cycles are currently rising vs descending.
            That's your "stack." A stack that's mostly rising tends to
            feel like an expanding season of life. Mostly descending feels
            more like a releasing season. Even splits feel mixed and often
            confusing — that's normal, not a problem.
          </p>
          <p>
            The slower cycles — Saturn, Chiron, Nodal — produce the
            biggest mood shifts when they flip. Watch those.
          </p>
        </Collapse>

        <Collapse title="Flips" subtitle="the exact moment a cycle changes direction">
          <p>
            A flip happens at the midpoint of every cycle. Solar return:
            the flip is roughly your half-birthday. Saturn: every ~14.7
            years. Chiron: every ~25 years. The Polarity tab shows the
            recent flips (last 14 days), the upcoming flips, and lets you
            forecast 6m / 12m / 2y / 5y ahead.
          </p>
        </Collapse>
      </section>

      {/* === THE MATH === */}
      <section id="math" className="mt-12 scroll-mt-4">
        <h2 className="h-display serif mb-2" style={{ fontSize: '1.6rem' }}>
          The math behind it.
        </h2>
        <p className="text-[14px] text-ink-dim serif leading-relaxed mb-4">
          Liraydhas isn't making anything up. Every position is computed
          from real ephemeris-grade orbital math, on your device.
        </p>

        <Collapse title="How positions are computed">
          <p>
            Planetary positions come from{' '}
            <span className="text-ink">astronomy-engine</span>, a
            well-validated open-source library that gives geocentric
            tropical longitudes accurate to within a few arcseconds for
            modern dates.
          </p>
          <p>
            Houses use the <span className="text-ink">Placidus</span>{' '}
            system (iterative semi-arc method, the most common Western
            convention). Above ~66° latitude Placidus breaks down and we
            fall back to equal houses.
          </p>
          <p>
            Your timezone is resolved from your birth city via{' '}
            <span className="text-ink">tz-lookup</span>, and historical
            DST shifts are handled correctly via the browser's built-in
            Intl APIs.
          </p>
        </Collapse>

        <Collapse title="The Design moment">
          <p>
            For the Design chart we binary-search backward to find the
            UTC moment when the Sun was at <em>exactly</em> 88° of
            ecliptic longitude earlier than your birth Sun — typically
            about 88 to 89 days before birth, depending on Earth's
            elliptical orbit speed at the time.
          </p>
        </Collapse>

        <Collapse title="The gate wheel">
          <p>
            Each of the 64 gates spans 5.625° of the ecliptic (360° ÷ 64).
            Each of its 6 lines spans 0.9375°. The wheel starts at{' '}
            <span className="text-ink">gate 41 at 2° Aquarius</span> (=
            302.0°) and proceeds clockwise in the canonical I-Ching
            sequence used by Ra Uru Hu's original Rave Mandala. This is
            why "Aquarius season" feels like a new year on the HD wheel —
            it literally is.
          </p>
        </Collapse>

        <Collapse title="The LLM daily readings">
          <p>
            The daily paragraph, polarity interpretation, and chart
            narrative are generated by Anthropic's Claude model, fed only
            your derived chart numbers (planets, gates, channels, type,
            authority) plus today's transits — never your raw birth data,
            never a name, never a location. The math runs on your phone;
            only the chart goes out, and only when you ask for a reading.
          </p>
        </Collapse>
      </section>

      <div className="mt-12 pt-6 border-t border-hairline">
        <p className="text-[12px] text-ink-faint serif">
          Want to go deeper? Open any tab in the app — every reading is
          built from the pieces explained on this page.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-[11px] caps" style={{ letterSpacing: '0.16em' }}>
          <Link href="/chart" className="btn-ghost">your chart →</Link>
          <Link href="/arcs" className="btn-ghost">your arcs →</Link>
          <Link href="/polarity" className="btn-ghost">your polarity →</Link>
          <Link href="/about" className="btn-ghost">about →</Link>
        </div>
      </div>
    </main>
  );
}

// 12 signs × (date range, one-line gist).
const SIGNS: [string, string, string][] = [
  ['Aries',       'Mar 21 – Apr 19', 'The starter. Pure forward motion. Doesn’t deliberate.'],
  ['Taurus',      'Apr 20 – May 20', 'The body, the soil, what you can touch. Slow, stubborn, sensual.'],
  ['Gemini',      'May 21 – Jun 20', 'The transmitter. Curiosity, language, never stops collecting inputs.'],
  ['Cancer',      'Jun 21 – Jul 22', 'The home. Emotional weather. Memory as a survival skill.'],
  ['Leo',         'Jul 23 – Aug 22', 'The performer. Wants to be seen, generous when it is.'],
  ['Virgo',       'Aug 23 – Sep 22', 'The craftsman. Discerning, precise, in service to whatever it loves.'],
  ['Libra',       'Sep 23 – Oct 22', 'The mirror. Lives in relation. Aesthetic intelligence.'],
  ['Scorpio',     'Oct 23 – Nov 21', 'The deep end. Intensity, intimacy, what won’t be small-talked.'],
  ['Sagittarius', 'Nov 22 – Dec 21', 'The arrow. Belief, philosophy, the long view. Restless.'],
  ['Capricorn',   'Dec 22 – Jan 19', 'The architect. Builds slowly, plays the long game, respects time.'],
  ['Aquarius',    'Jan 20 – Feb 18', 'The signal from outside. Future-tense, communal, idiosyncratic.'],
  ['Pisces',      'Feb 19 – Mar 20', 'The dissolver. Empathic, oceanic, the boundary between self and everything.'],
];

const PLANETS: [string, string][] = [
  ['Sun',     'Your conscious self. The "I" that you identify with.'],
  ['Moon',    'Your inner weather. What you need to feel safe. Childhood.'],
  ['Mercury', 'How you think and speak. The mind, the messenger.'],
  ['Venus',   'What you love and what you find beautiful. Relating, art, money as taste.'],
  ['Mars',    'Your action and anger. What you fight for. Drive.'],
  ['Jupiter', 'Where you expand. What you trust the world to give. Luck, belief.'],
  ['Saturn',  'Structure and consequence. The teacher who shows up via limits.'],
  ['Uranus',  'Sudden change, electricity, the part of you that breaks with the past.'],
  ['Neptune', 'Dreams, dissolution, the ocean. Where you’re susceptible to glamor.'],
  ['Pluto',   'Underworld, power, what compulsively transforms in you. Slow, irreversible.'],
  ['North Node', 'The direction your life is pulling you toward — uncomfortably new.'],
  ['Chiron',  'The original wound that becomes, with work, the original teaching.'],
];
