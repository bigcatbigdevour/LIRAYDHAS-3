# Liraydhas

A Co-Star-style daily astrology + Human Design + life-cycle visualization
app. Enter your birth data once; get a real daily reading driven by today's
transits to your natal chart, a full Human Design blueprint computed from
ephemeris-accurate math, and a unique visual reading of every major life
cycle drawn end to end across your lifespan. Built to feel like Co-Star —
pitch-black background, large serif headings, sharp edges, slow film
grain, one wine-red accent.

## The four tabs

- **Today** — daily LLM-written paragraph anchored on your tightest current
  transits + HD gates currently being touched + HD channels temporarily
  completing for you. Current sky visual with breathing stars. Your moon
  phase, next lunation, current retrogrades, recent polarity flips, next
  major life event, week-ahead aspects.
- **Arcs** — every major cycle (Solar, Mars, Jupiter, Saturn, Nodal,
  Chiron, Progressed Moon) drawn end to end from age 0 to 92. Interactive:
  scrub through any age to see what arcs you were inside; tap any arc for
  a per-iteration reading; tap a station diamond to jump to its detail
  card. 14 named "convergence stations" where multiple cycles align.
  Play-your-life animation. URL state for shareable deep links.
- **Polarity** — every cycle has a polarity (rising or descending half).
  See the entire stack at a glance. Per-cycle bars with flip dates. Live
  12-month forecast heatmap (6m / 12m / 2y / 5y range). Unified
  chronological timeline of upcoming events. HD-authority-specific
  guidance for relating to flips.
- **Chart** — HD bodygraph (tap any defined center or channel for its
  meaning), the 26 personality + design activations, type/profile/
  authority/cross with expandable descriptions, natal astrology wheel
  with Placidus houses, sign meanings, numerology, current cycle status.

## Stack

- **Next.js 14** App Router + **TypeScript** + **Tailwind**
- **astronomy-engine** for tropical longitudes, sidereal time, lunar phase
- **tz-lookup** + `Intl.DateTimeFormat` for civil-time → UTC conversion
- **Open-Meteo geocoding** (free, no key) for city → lat/lon
- **D3** for the Arcs view
- **Zustand** + `localStorage` for the blueprint and cached LLM reports
- **Anthropic Claude** (default `claude-sonnet-4-6`) for the daily, polarity,
  and one-time chart narratives

## Setup

```bash
npm install
cp .env.example .env.local
# add your ANTHROPIC_API_KEY
npm run dev
```

Open <http://localhost:3000>. First load goes to `/onboarding`; after the
blueprint is computed it persists in `localStorage` and the app lands on
`/today`. To deploy, just push this branch to Vercel and add
`ANTHROPIC_API_KEY` as an env var.

The app ships a web app manifest (`/manifest.webmanifest`), apple-touch
icons, and `apple-mobile-web-app-capable: yes` — so installing via Safari's
"Add to Home Screen" gets a standalone PWA with a translucent black status
bar and a clean icon.

## Routes

| Route             | What                                                         |
| ----------------- | ------------------------------------------------------------ |
| `/`               | Bounce to `/onboarding` or `/today` based on stored state    |
| `/onboarding`     | Intro splash, then date/time/place form                      |
| `/today`          | Daily Co-Star paragraph, current sky wheel, the week ahead   |
| `/arcs`           | Lifelong cycle arcs (D3) with today marker                   |
| `/polarity`       | Rising/descending bars per cycle + LLM interpretation        |
| `/chart`          | HD bodygraph, narrative, activations, natal wheel, numerology|
| `/about`          | Glossary of tabs, aspects, HD basics                         |
| `POST /api/daily` | LLM daily paragraph from `{ blueprint }`                     |
| `POST /api/polarity`  | LLM cycle-stack interpretation (cached weekly)           |
| `POST /api/narrative` | Once-per-blueprint personalised reading                  |

## Key features

### Daily (`/today`)

- Date + current moon phase + sign in the header
- Next lunation hint ("full moon in 3 days") within a week of any quarter
- Retrograde indicator (`℞ Mercury · Mars`) when any inner planet is retro
- Solar-return banner on the user's birthday
- LLM-generated Co-Star-voiced paragraph anchored on:
  - the three tightest transits to natal chart
  - any natal HD gates currently being touched by transiting planets
  - any HD channels temporarily completing today
  - current retrogrades
- The "today, on your chart" section shows lit natal gates and
  temporarily-complete channels (tap a channel for its short meaning)
- "The week ahead" — five tightest upcoming aspects in the next 7 days
- Circular SVG sky with today's planets at full opacity and natal planets
  rendered as faint inner ghosts; tick on the outer ring marks the natal
  Sun; tight transits to natal planets render in wine-accent
- Rolling 7-day strip of past daily paragraphs (30-day store cap)
- Mini "you" summary at the bottom for context
- Solar return countdown

### Chart (`/chart`)

- HD bodygraph with all 64 gate anchors, 36 channels, 9 centers — defined
  centers filled in their (desaturated) traditional colors, defined
  channels solid white, design-only gates in wine, personality in cream
- Personalised one-time LLM narrative (cached, regenerates on reset)
- Personality / Design two-column activations readout (26 rows)
- Tap-to-expand details for Type, Authority, Profile (with line names)
- Incarnation Cross resolved to its named cross when recognised
- Natal wheel with house numbers and all four angles (ASC/IC/DSC/MC),
  major aspect lines. Uses **equal houses** (each cusp at ASC + 30°·(i−1)).
- Planet-in-house readout (Sun · Pisces 5.4° · H6 · 55.6)
- Sun, Moon, Rising one-liners
- Life-path numerology

### Other small joys

- A tiny pixel bunny and a tiny pixel bird hop into view every ~25
  seconds, hop a few times, then vanish. Deliberately out of place.
- Subtle pulse on the natal Sun tick (Sky Visual) and the "now" line
  (Arcs).
- Web Share API integration so iPhone users can share today's reading
  to Messages/Notes etc.
- Native "Add to Home Screen" banner for iPhone Safari first-time users
  (dismissable).

### Arcs / Polarity

- D3 arc diagram with ticks per cycle event and arcs between consecutive
  returns; today marker; per-cycle legend; tap-hover tooltip
- Polarity bars per cycle (Solar, Mars, Jupiter, Saturn, Nodal, Chiron,
  Progressed Moon); tap-to-expand cycle descriptions; LLM-generated
  interpretation paragraph cached for a week

## Project layout

```
/lib
  astrology/   natal, transits, houses, moon, returns, sign meanings
  humandesign/ gate wheel, channels, centers, derivation, channel meanings,
               interpretations, transit-gates, calculate
  location/    geocoding + timezone resolution
  blueprint.ts compose Blueprint from birth data
  cycles.ts    cycle definitions + position calc
  numerology.ts life-path number
  store.ts     Zustand store persisted to localStorage
  anthropic.ts Claude client
  types.ts     shared types
/components
  TabBar SkyVisual BodyGraph NatalWheel ActivationColumns
  ArcDiagram PolarityBars PlaceAutocomplete MoonIcon
/app
  page.tsx onboarding/ today/ arcs/ polarity/ chart/ about/
  api/daily api/polarity api/narrative
  manifest.ts globals.css layout.tsx
/public  icon-192.svg icon-512.svg
/scripts test-hd.mts verify.mts
```

## How the Human Design calculation works

1. Compute geocentric tropical longitudes for Sun, Earth, Moon, North/South
   Nodes, and the seven planets at the birth instant (**personality chart**).
2. Binary-search the UTC moment at which the Sun was exactly 88° of ecliptic
   longitude *earlier* — that's the **design chart** moment.
3. Map each longitude to a gate/line via the 64-gate wheel that begins at
   gate 41 at 302° (2° Aquarius), 5.625° per gate, 0.9375° per line.
4. A center is **defined** if *both* gates of any channel terminating in it
   are activated by any of the 26 activations.
5. Type / authority / profile / definition derive from the defined-center
   graph (Sacral + throat-motor path → MG; Sun line / Sun line → profile).

## Verification

```bash
npx tsx scripts/verify.mts
```

17 structural and sanity assertions on the gate wheel, channel set,
center coverage, and a Steve Jobs sample blueprint.

## Environment

| Variable             | Required | Purpose                                  |
| -------------------- | -------- | ---------------------------------------- |
| `ANTHROPIC_API_KEY`  | yes      | For the daily / polarity / narrative LLMs |
| `ANTHROPIC_MODEL`    | no       | Override the Claude model                |

Without an API key, all client-side features (blueprint, chart, arcs,
polarity bars, sky visual, transits, etc.) still work; only the
LLM-written paragraphs will surface an error message.
