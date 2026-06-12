'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TYPE_DESCRIPTIONS, AUTHORITY_DESCRIPTIONS } from '@/lib/humandesign/interpretations';
import { CENTER_MEANINGS } from '@/lib/humandesign/centerMeanings';
import { CYCLES } from '@/lib/cycles';
import { LIFE_STATIONS } from '@/lib/lifeStations';

// Light-weight collapsible — no library, no animation lib, just a button
// + a div. Each section is independently expandable so a reader can dip
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
          Every reading in Liraydhas is computed from your exact birth
          moment using real ephemeris math. This page explains every piece
          of what you see, in plain English, in the order it shows up.
        </p>
      </header>

      <nav className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[10px] caps text-ink-faint border-t border-b border-hairline py-1.5" style={{ letterSpacing: '0.12em' }}>
        <a href="#astrology" className="hover:text-ink">astrology</a>
        <a href="#chart" className="hover:text-ink">the body chart</a>
        <a href="#cycles" className="hover:text-ink">cycles</a>
        <a href="#stations" className="hover:text-ink">life-stations</a>
        <a href="#polarity" className="hover:text-ink">polarity</a>
        <a href="#compat" className="hover:text-ink">compatibility</a>
        <a href="#math" className="hover:text-ink">the math</a>
        <a href="#glossary" className="hover:text-ink">glossary</a>
      </nav>

      {/* === ASTROLOGY === */}
      <section id="astrology" className="mt-10 scroll-mt-4">
        <h2 className="h-display serif mb-2" style={{ fontSize: '1.6rem' }}>
          Astrology.
        </h2>
        <p className="text-[14px] text-ink-dim serif leading-relaxed mb-4">
          A natal chart is the sky at the exact moment you were born, drawn
          as a circle. Earth sits in the middle. The ring is divided into
          twelve 30° slices — the zodiac signs. Each planet's position in
          the ring carries a different layer of meaning about a different
          part of you.
        </p>

        <Collapse title="The natal chart" subtitle="what the wheel actually shows" defaultOpen>
          <p>
            Imagine standing outside your birth moment and looking up. The
            planets are scattered across a 360° band of sky called the
            ecliptic — the path the Sun travels through over the course of
            a year. The chart projects that band onto a flat circle and
            divides it into twelve signs.
          </p>
          <p>
            The chart has four critical angles — Ascendant (the rising
            sign, the eastern horizon), Descendant (the western horizon),
            Midheaven (the highest point), and IC (the lowest point). The
            rising sign in particular is your "approach" — how you arrive
            in a room before you speak.
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

        <Collapse title="The planets" subtitle="ten archetypes, each governing a piece of you">
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
            When two planets sit at a meaningful angle from each other
            (measured in degrees of the ring), they interact. Five major
            aspects do most of the work:
          </p>
          <Term name="Conjunction · 0°" def="Same place. The two archetypes fuse. Intense, often one-note." />
          <Term name="Sextile · 60°" def="A friendly tap. A small opening, an opportunity. Easy if used." />
          <Term name="Square · 90°" def="Tension. The two archetypes push on each other. The kind of friction that makes you grow." />
          <Term name="Trine · 120°" def="An easy flow. A talent. So easy it is often taken for granted." />
          <Term name="Opposition · 180°" def="See-saw. The two archetypes pull against each other across the chart. The work is integration, not choosing a side." />
        </Collapse>

        <Collapse title="Houses" subtitle="twelve life arenas, anchored to your birth location">
          <p>
            Once the wheel is drawn for your birth location and time, it
            gets divided into twelve houses — distinct life arenas. House
            1 starts at your Ascendant. A planet's house tells you{' '}
            <em>where</em> in life it shows up — 1st = self, 2nd = money
            and values, 7th = partnerships, 10th = career, and so on.
            Liraydhas uses the Placidus system, the most common house
            division in Western astrology.
          </p>
        </Collapse>

        <Collapse title="Transits" subtitle="today's sky, hitting your natal chart">
          <p>
            Your natal chart is fixed at birth, but the planets keep
            moving. A transit is what today's sky is doing relative to
            your natal chart. When transiting Saturn squares your natal
            Sun, you'll know it. The Today tab pulls the three tightest
            transits to your chart each day and writes the reading around
            them.
          </p>
        </Collapse>
      </section>

      {/* === THE BODY CHART === */}
      <section id="chart" className="mt-12 scroll-mt-4">
        <h2 className="h-display serif mb-2" style={{ fontSize: '1.6rem' }}>
          The body chart.
        </h2>
        <p className="text-[14px] text-ink-dim serif leading-relaxed mb-4">
          The Chart tab shows a body-shaped diagram with nine geometric
          centers, sixty-four numbered gates, and thirty-six channels
          connecting them. Two underlying charts are computed and overlaid:
          one at your birth moment, and one at the moment when the Sun
          was exactly 88° of arc earlier — about three months before
          birth.
        </p>

        <Collapse
          title="The two charts overlaid"
          subtitle="conscious and unconscious sides"
          defaultOpen
        >
          <p>
            The chart drawn at your birth moment represents what you know
            about yourself — your conscious self-image, the things you
            can describe. Its gates render in{' '}
            <span className="text-ink">cream</span>.
          </p>
          <p>
            The chart drawn at the moment the Sun was 88° earlier
            represents what your body knows but your mind often doesn't.
            Its gates render in <span className="text-accent">wine</span>.
            This is the layer other people often see in you before you
            see it yourself.
          </p>
          <p>
            Together the two charts produce 26 activations — 13 planetary
            positions each — and those 26 activations light up gates on
            the body chart.
          </p>
        </Collapse>

        <Collapse title="The five types" subtitle="how your energy is built to operate">
          {Object.entries(TYPE_DESCRIPTIONS).map(([type, desc]) => (
            <Term key={type} name={type} def={desc} />
          ))}
        </Collapse>

        <Collapse title="Authority" subtitle="how your body says yes or no">
          <p>
            Your strategy describes <em>how</em> to engage the world. Your
            authority describes <em>how to decide</em> within that
            engagement. Authority is derived from which centers are
            defined in a strict priority order:
          </p>
          {Object.entries(AUTHORITY_DESCRIPTIONS).map(([name, desc]) => (
            <Term key={name} name={name} def={desc} />
          ))}
        </Collapse>

        <Collapse title="The nine centers" subtitle="the geometric shapes">
          <p>
            Each center has a fixed function. When a center is{' '}
            <span className="text-ink">defined</span> — filled in — it
            broadcasts that energy consistently. When it's{' '}
            <span className="text-ink-faint">open</span>, it absorbs and
            amplifies that energy from whoever's around you. Open centers
            are where you can lose yourself, and also where you tend to
            learn the most.
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

        <Collapse title="Gates and channels" subtitle="the numbered circles and the lines">
          <p>
            There are <span className="text-ink">64 gates</span>, one per
            I Ching hexagram, arranged around the ecliptic. Each of your
            26 activations falls inside one gate. A gate is "lit" when at
            least one activation falls inside it.
          </p>
          <p>
            There are <span className="text-ink">36 channels</span>, each
            connecting two specific gates across two centers. A channel
            is defined only when both of its gates are lit in your chart
            — then it renders solid across its full length and defines
            both centers it connects.
          </p>
          <p>
            A "hanging gate" is one half of a channel — your gate is lit
            but your channel partner's isn't. You'll feel pulled to people
            who carry the complementary gate, because they'll temporarily
            complete the channel for you.
          </p>
        </Collapse>

        <Collapse title="Profile" subtitle="the lines of your two Suns">
          <p>
            Each gate has six sub-divisions called "lines" (1 through 6).
            Your profile is read as the line of your birth-moment Sun
            over the line of your earlier-Sun chart — for example "5/1"
            (Heretic / Investigator) or "6/3" (Role Model / Martyr).
          </p>
          <p>
            The first number is the role you consciously play. The second
            is the foundation your body builds it on. There are 12 valid
            profiles, each with a recognizable archetype.
          </p>
        </Collapse>

        <Collapse title="Definition" subtitle="how your defined centers are wired together">
          <p>
            Look at all your defined centers as a graph: centers are
            nodes, channels are edges. The number of disconnected
            "islands" is your definition:{' '}
            <span className="text-ink">Single</span> (one island,
            everything connected),{' '}
            <span className="text-ink">Split</span> (two),{' '}
            <span className="text-ink">Triple Split</span> (three), or{' '}
            <span className="text-ink">Quadruple Split</span> (four).
            Splits affect how you experience your own decision process
            — splits often want external bridges to feel whole.
          </p>
        </Collapse>

        <Collapse title="Incarnation cross" subtitle="the four pillars of your life's purpose">
          <p>
            The four gates at the Sun and Earth of both charts — birth
            Sun, birth Earth, earlier Sun, earlier Earth — form your
            incarnation cross, the deepest theme of your lifetime. The
            cross is not a prescription. It is the backdrop your
            decisions are made against.
          </p>
        </Collapse>
      </section>

      {/* === CYCLES === */}
      <section id="cycles" className="mt-12 scroll-mt-4">
        <h2 className="h-display serif mb-2" style={{ fontSize: '1.6rem' }}>
          Cycles.
        </h2>
        <p className="text-[14px] text-ink-dim serif leading-relaxed mb-4">
          Each planet takes a different amount of time to orbit the Sun —
          or, for the Moon, the Earth. When a planet returns to the exact
          position it was at when you were born, that's a "return," and
          returns reliably correspond to recognizable life stages.
        </p>

        <Collapse title="The seven cycles tracked here" defaultOpen>
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
            A return is when a planet finishes one full orbit since your
            birth. The most well-known: the{' '}
            <span className="text-ink">Saturn return</span> at ages ~29
            and ~59, where the structures of your life get a serious
            audit. The <span className="text-ink">Chiron return</span> at
            ~50 is once-a-lifetime — the original wound becoming the
            original teaching.
          </p>
          <p>
            "Stations" are the named ages where multiple cycles converge
            on the same point of the timeline — twelve, twenty-nine,
            forty-five, fifty, fifty-nine. These aren't superstition.
            They're where the math literally stacks.
          </p>
        </Collapse>
      </section>

      {/* === LIFE STATIONS === */}
      <section id="stations" className="mt-12 scroll-mt-4">
        <h2 className="h-display serif mb-2" style={{ fontSize: '1.6rem' }}>
          Life-stations.
        </h2>
        <p className="text-[14px] text-ink-dim serif leading-relaxed mb-4">
          The Arcs tab marks fourteen named ages where multiple cycles
          converge — the moments that nearly everyone experiences as a
          structural shift. They aren't deterministic; they describe a
          recognisable shape, not a script.
        </p>

        <Collapse title="What each station tends to bring" subtitle="not a forecast — a recognised shape" defaultOpen>
          {LIFE_STATIONS.map((s) => (
            <div key={s.age} className="border-l-2 border-hairline pl-3 py-1.5">
              <p className="serif text-[14px] text-ink">
                Age {s.age}: <span className="text-ink-dim italic">{s.label}</span>
              </p>
              <p
                className="small-label caps text-[10px] text-ink-faint mt-0.5"
                style={{ letterSpacing: '0.1em' }}
              >
                {s.convergence}
              </p>
              <p className="text-[13px] text-ink-dim serif leading-relaxed mt-1">
                {s.description}
              </p>
            </div>
          ))}
        </Collapse>

        <Collapse title="What they don't mean" subtitle="reading the math without superstition">
          <p>
            A life-station is a moment when several of the cycles
            you&apos;re inside happen to cross on the same age. It tells
            you something predictable about TIMING — that change is more
            likely to arrive — without prescribing the CONTENT of that
            change. Two people born a year apart hit the same station
            at the same calendar age and live entirely different things
            inside it.
          </p>
          <p>
            They aren&apos;t doom or destiny. They&apos;re a structural
            heads-up: the system is asking for an upgrade right around
            now. What that upgrade looks like is yours.
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
          <span className="text-ink">descending</span> — completing,
          releasing, integrating. The Polarity tab shows where every one
          of your cycles is right now.
        </p>

        <Collapse title="Reading your polarity stack" defaultOpen>
          <p>
            Add up which of your cycles are currently rising and which
            are descending — that's your stack. A stack that's mostly
            rising tends to feel like an expanding season of life.
            Mostly descending feels more like a releasing season. Even
            splits feel mixed and often confusing — that is normal, not
            a problem.
          </p>
          <p>
            The slower cycles — Saturn, Chiron, Nodal — produce the
            biggest mood shifts when they flip. Those are the ones to
            watch.
          </p>
        </Collapse>

        <Collapse title="Flips" subtitle="the exact moment a cycle changes direction">
          <p>
            A flip happens at the midpoint of every cycle. The Solar
            flip is roughly your half-birthday. Saturn flips every ~14.7
            years. Chiron every ~25. The Polarity tab shows recent flips
            (last 14 days), upcoming flips, and a forecast 6 months / 12
            months / 2 years / 5 years ahead.
          </p>
        </Collapse>
      </section>

      {/* === COMPATIBILITY === */}
      <section id="compat" className="mt-12 scroll-mt-4">
        <h2 className="h-display serif mb-2" style={{ fontSize: '1.6rem' }}>
          Compatibility.
        </h2>
        <p className="text-[14px] text-ink-dim serif leading-relaxed mb-4">
          The Compatibility tab pairs your chart with another person&apos;s
          and writes about how the two meet — but it always layers in
          where each of you is in your own life at the same moment. The
          same chart contact lands differently when one of you is
          approaching a Saturn return and the other is mid-Chiron.
        </p>

        <Collapse title="What it looks at" defaultOpen>
          <ul className="space-y-2">
            <li>
              <span className="text-ink">Cross-chart contacts</span>{' '}
              — the tightest aspects between your Sun, Moon, Mercury,
              Venus, Mars, and North Node and theirs. The slow outer
              planets are skipped because their cross-chart aspects are
              generational, not personal.
            </li>
            <li>
              <span className="text-ink">Electric channels</span>{' '}
              — channels where you carry one gate, they carry the other,
              and neither of you carries both. The current only flows
              when you&apos;re connected. Useful when something
              meaningfully changes about how you operate when this
              specific person is in the room.
            </li>
            <li>
              <span className="text-ink">Life-stage context</span>{' '}
              — your current age, life chapter, and polarity stack
              alongside theirs. A reading marks whether you&apos;re in
              the same chapter or different ones, and the age gap.
            </li>
          </ul>
        </Collapse>

        <Collapse title="What it deliberately doesn't do">
          <ul className="space-y-2">
            <li>It does not predict whether the relationship works.</li>
            <li>
              It does not use the words &ldquo;soulmate&rdquo;,
              &ldquo;twin flame&rdquo;, &ldquo;karmic&rdquo;,
              &ldquo;destined&rdquo;, or &ldquo;meant to be.&rdquo;
            </li>
            <li>
              It does not tell you what to do with someone. It tells
              you what the connection is currently shaped like, given
              who you each are right now.
            </li>
          </ul>
        </Collapse>

        <Collapse title="Who to add" subtitle="anyone whose chart you want next to yours">
          <p>
            Partner, child, parent, sibling, close friend, ex, boss,
            collaborator. Anyone. The tab doesn&apos;t assume romance.
            You can add as many people as you want; each lives on your
            device.
          </p>
          <p>
            You only need their birth date, time (if known), and place.
            If birth time is unknown the reading is still useful; the
            chart is computed for noon at their birth place and the
            rising-sign-dependent contacts are skipped.
          </p>
        </Collapse>
      </section>

      {/* === THE MATH === */}
      <section id="math" className="mt-12 scroll-mt-4">
        <h2 className="h-display serif mb-2" style={{ fontSize: '1.6rem' }}>
          The math.
        </h2>
        <p className="text-[14px] text-ink-dim serif leading-relaxed mb-4">
          Every position in the app is computed from real ephemeris-grade
          orbital math, on your device.
        </p>

        <Collapse title="How positions are computed">
          <p>
            Planetary positions come from a well-validated open-source
            ephemeris library that produces geocentric tropical longitudes
            accurate to within a few arcseconds for modern dates.
          </p>
          <p>
            Houses use the <span className="text-ink">Placidus</span>{' '}
            system (iterative semi-arc method, the most common Western
            convention). Above ~66° latitude Placidus breaks down and we
            fall back to equal house cusps.
          </p>
          <p>
            Your timezone is resolved from your birth city's coordinates,
            and historical daylight-saving shifts are handled correctly
            through the browser's built-in international date APIs.
          </p>
        </Collapse>

        <Collapse title="The second chart's moment">
          <p>
            For the unconscious side of the body chart we binary-search
            backward to find the UTC moment when the Sun was at exactly
            88° of ecliptic longitude earlier than your birth Sun —
            typically about 88 to 89 days before birth, depending on
            Earth's elliptical orbit speed at the time.
          </p>
        </Collapse>

        <Collapse title="The gate wheel">
          <p>
            Each of the 64 gates spans 5.625° of the ecliptic (360° ÷
            64). Each of its 6 lines spans 0.9375°. The wheel begins at
            gate 41 at 2° of Aquarius (302.0°) and proceeds clockwise in
            the canonical I Ching sequence. Aquarius season feels like a
            new year on this wheel because it literally is.
          </p>
        </Collapse>

        <Collapse title="The written readings">
          <p>
            The daily paragraph, the polarity interpretation, and the
            chart narrative are produced by a large language model, fed
            only the derived numbers from your chart — planets, gates,
            channels, type, authority — plus the day's transits. The raw
            birth data never leaves your device. Names, locations, and
            identifiers are never sent. The math runs on your phone;
            only the chart numbers go out, and only when you ask for a
            reading.
          </p>
        </Collapse>
      </section>

      {/* === GLOSSARY === */}
      <section id="glossary" className="mt-12 scroll-mt-4">
        <h2 className="h-display serif mb-2" style={{ fontSize: '1.6rem' }}>
          Glossary.
        </h2>
        <p className="text-[14px] text-ink-dim serif leading-relaxed mb-4">
          Words this app uses, in the order you&apos;ll hit them.
        </p>
        <dl className="space-y-3 text-[13.5px] serif">
          {GLOSSARY_TERMS.map(({ term, def }) => (
            <div key={term} className="border-l-2 border-hairline pl-3 py-1">
              <dt className="small-label caps text-ink" style={{ letterSpacing: '0.14em' }}>
                {term}
              </dt>
              <dd className="text-ink-dim mt-1 leading-relaxed">{def}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-12 pt-6 border-t border-hairline">
        <p className="text-[12px] text-ink-faint serif">
          Every reading in the app is built from the pieces explained on
          this page.
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

/**
 * Glossary entries — added as the user encounters them in the app.
 * Roughly ordered by first encounter (onboarding → /today → /chart →
 * /polarity → /arcs → /compat).
 */
const GLOSSARY_TERMS: Array<{ term: string; def: string }> = [
  { term: 'Blueprint', def: 'The full computed picture of you from your birth data: your natal astrology chart plus your body chart. Lives only on this device.' },
  { term: 'Natal chart', def: 'The map of the sky at the exact moment you were born — every planet, the sun, the moon, the angles. The basis of every reading.' },
  { term: 'Transit', def: 'Where a planet is right now relative to its position when you were born. "Saturn square Sun" means transiting Saturn is currently 90° from where your natal Sun is.' },
  { term: 'Aspect', def: 'A specific angular relationship between two planets. Conjunction (same place), sextile (60°), square (90°), trine (120°), opposition (180°). Each has a feel.' },
  { term: 'Orb', def: 'How close to exact an aspect is, in degrees. A 0.4° orb is much tighter and more felt than a 6° one.' },
  { term: 'Rising sign', def: 'The zodiac sign on the eastern horizon when you were born. Shapes how you arrive in a room — your first-impression layer.' },
  { term: 'Body chart', def: 'The Human Design chart — nine centres connected by thirty-six channels, sixty-four gates. Tells you how you make decisions and where you broadcast vs. absorb.' },
  { term: 'Gate', def: 'One of 64 specific zones of the zodiac wheel that maps to the I Ching hexagrams. Each gate brings a specific theme.' },
  { term: 'Channel', def: 'Two connected gates between two centres. When both gates are active (in your natal chart), the channel is defined and the centres are connected.' },
  { term: 'Defined centre', def: 'A centre with at least one fully-active channel terminating in it. Broadcasts its energy consistently — you feel reliably "yourself" in that domain.' },
  { term: 'Open centre', def: 'A centre with no fully-active channel terminating in it. Absorbs and amplifies whoever you\'re around. The site of much of your conditioning.' },
  { term: 'Type', def: 'The five Human Design types — Manifestor, Generator, Manifesting Generator, Projector, Reflector. Determined by which centres are defined.' },
  { term: 'Authority', def: 'How your body knows what\'s right for you. Sacral, Splenic, Emotional, Ego, Self-projected, Mental, Lunar. Not a thinking process.' },
  { term: 'Profile', def: 'Two numbers, e.g. 6/2, made from the lines of your Sun gates. A high-level description of how you move through the world.' },
  { term: 'Cycle', def: 'A planet\'s orbital period — Saturn returns every ~29.5 years, Jupiter every ~12. You are inside multiple cycles at every age.' },
  { term: 'Return', def: 'The moment a planet finishes one full orbit since you were born. Saturn return at ~29, Chiron return at ~50.' },
  { term: 'Rising / Descending', def: 'A cycle\'s first half is "rising" — building, accumulating. The second half is "descending" — completing, releasing. Both halves are necessary.' },
  { term: 'Flip', def: 'The midpoint of a cycle — the exact moment rising switches to descending or back. The slow cycles\' flips are felt as mood shifts.' },
  { term: 'Polarity stack', def: 'The total picture of which of your cycles are currently rising and which are descending. A mostly-rising stack feels like an opening season.' },
  { term: 'Life-station', def: 'A named age where multiple cycles converge (e.g. Saturn return at 29, midlife around 45). The structural moments nearly everyone hits at roughly the same age.' },
  { term: 'Life chapter', def: 'A larger arc that spans several stations — childhood, adolescence, young adulthood, midlife, late life, elderhood. Coarser than a station, deeper than a cycle.' },
  { term: 'Synastry', def: 'The set of cross-chart aspects between two people\'s natal charts. What this app calls the Compatibility tab.' },
  { term: 'Electric channel', def: 'A Human Design channel where you carry one gate, the other person carries the other, and neither of you has both. The current only flows when you\'re connected.' },
  { term: 'Takeaway', def: 'The one-line italic that appears above your daily reading. The reading distilled to a glance, written by the same model that wrote the paragraph below.' },
];
