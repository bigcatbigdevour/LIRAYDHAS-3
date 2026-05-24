# Liraydhas

A Co-Star-style daily astrology + Human Design web app. Enter your birth data
once; get a real daily reading driven by today's transits to your natal chart
and a full Human Design blueprint derived from ephemeris-accurate calculations.

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind**
- **astronomy-engine** — pure-JS ephemeris, ~arcminute precision
- **tz-lookup** + Intl — birth-civil → UTC conversion
- **Open-Meteo geocoding** for city → lat/lon
- **D3** for the Arcs view
- **Zustand** + `localStorage` for the blueprint
- **Anthropic Claude** for the daily report paragraph

## Setup

```bash
npm install
cp .env.example .env.local
# edit .env.local and add your ANTHROPIC_API_KEY
npm run dev
```

Open <http://localhost:3000>. First load goes to onboarding; after the
blueprint is computed it persists in `localStorage` and you land on `/today`.

## Routes

| Route        | What                                                            |
| ------------ | --------------------------------------------------------------- |
| `/`          | Bounce to `/onboarding` or `/today` based on stored blueprint   |
| `/onboarding`| Birth date / time / place                                        |
| `/today`     | Daily Co-Star paragraph, top transits, current sky wheel        |
| `/arcs`      | Life-long cycle arcs (D3)                                       |
| `/polarity`  | Rising / descending bars per cycle                              |
| `/chart`     | HD bodygraph + natal wheel + summary                            |
| `POST /api/daily` | LLM-generated paragraph from `{ blueprint }`               |

## Project layout

```
/lib
  astrology/   natal chart + transits (astronomy-engine)
  humandesign/ gate wheel, channels, centers, derivation
  location/    geocoding + timezone resolution
  blueprint.ts compose Blueprint from birth data
  cycles.ts    cycle definitions for Arcs / Polarity
  store.ts     Zustand store persisted to localStorage
  anthropic.ts Claude client
  types.ts     core data shapes
/components
  TabBar SkyVisual BodyGraph NatalWheel
  ArcDiagram PolarityBars PlaceAutocomplete
/app
  page.tsx onboarding/ today/ arcs/ polarity/ chart/
  api/daily/route.ts
```

## How the Human Design calculation works

1. Compute geocentric tropical longitudes for Sun, Earth, Moon, North/South
   Nodes, and the seven planets at the birth instant (**personality chart**).
2. Binary-search the UTC moment at which the Sun was exactly 88° of ecliptic
   longitude *earlier* — that's the **design chart** moment. Re-compute the
   same 13 longitudes there.
3. Map each longitude to a gate/line via the 64-gate wheel that begins at
   gate 41 at 302° (2° Aquarius), 5.625° per gate, 0.9375° per line.
4. A center is **defined** if *both* gates of any channel terminating in it
   are activated by any of the 26 activations.
5. Type / authority / profile / definition derive from the defined-center
   graph per the canon (Sacral + throat-motor path → MG; Sun line over Sun
   line → profile; etc.).

## Verification

`scripts/test-hd.mts` computes the full blueprint for Steve Jobs, Carl Sagan,
and Frida Kahlo, plus a few gate-wheel boundary cases. Run:

```bash
npx tsx scripts/test-hd.mts
```

## Environment

| Variable             | Required | Purpose                                  |
| -------------------- | -------- | ---------------------------------------- |
| `ANTHROPIC_API_KEY`  | yes      | For the daily report                     |
| `ANTHROPIC_MODEL`    | no       | Override the Claude model                |
