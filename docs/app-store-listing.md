# App Store listing — draft

Copy-paste-ready text for the App Store Connect submission form.
Subject to App Review feedback.

## App name (max 30 chars)

Liraydhas

## Subtitle (max 30 chars)

Daily astrology, on your chart

## Promotional text (max 170 chars, editable without resubmission)

A daily reading written from your exact birth chart, plus a body chart
and a map of every life cycle from age 0 to 92.

## Keywords (max 100 chars, comma-separated)

astrology,horoscope,natal chart,transits,birth chart,daily,zodiac,
moon phase,life cycle

## Description

Liraydhas reads your exact birth moment and produces a daily reading
from real ephemeris math. A short paragraph each day, written in a
direct, dry, slightly mystical voice. Anchored in your real chart, not
in your sun sign.

WHAT YOU GET

- A daily paragraph anchored on your three tightest current transits,
  the natal gates being touched today, and any channels temporarily
  completing for you.
- A "current sky" view — your planets, the moon's phase, and any
  retrogrades visible at a glance.
- A full body chart: type, strategy, profile, all 64 gates, all 36
  channels, all 9 centers. Tap any defined channel or center to see
  what it means.
- Your natal astrology wheel with Placidus houses, the four angles,
  major aspects, and one-line interpretations of your Sun, Moon, and
  Rising.
- The Arcs view: every major life cycle (solar return, Mars, Jupiter,
  Saturn, Nodal, Chiron, progressed Moon) drawn end-to-end from age
  0 to 92. Scrub to any age. See the 14 named "convergence stations"
  where multiple cycles align — first Saturn return, Chiron return,
  midlife crossing.
- The Polarity view: every cycle has a rising and a descending half.
  See the whole stack at once. Forecast 6 months, 12 months, 2 years,
  or 5 years ahead. Subscribe to the iCal feed of upcoming flips.

PRIVACY

Liraydhas does not have a database. Your birth data lives only on
your device. The daily and chart readings send your derived chart
(not your raw birth data) to our server, which calls Anthropic's
Claude API. No accounts. No analytics. No trackers. No ads.

THE MATH IS REAL

Tropical longitudes from astronomy-engine; Placidus houses via
iterative semi-arc; design chart from the 88°-of-solar-arc moment;
gate wheel anchored at 41 → 2° Aquarius. We ran a Steve Jobs sample
chart against published references and the chart structure matches.

## What's New (for first release)

First release. Welcome.

## Support URL

https://liraydhas-3.vercel.app/about

## Marketing URL

https://liraydhas-3.vercel.app

## Privacy Policy URL

https://liraydhas-3.vercel.app/privacy

## Category

Primary: Lifestyle
Secondary: Reference

## Age Rating

4+ (no objectionable content)

## Pricing

Free.

## Data Privacy disclosures (App Store Connect form)

- **Data Linked to You**: None.
- **Data Not Linked to You**:
  - Other Data: birth date, birth time, birth location are stored on
    device only (no server-side persistence). The derived chart is
    sent to our server to generate the daily reading and is then
    discarded.
- **Tracking**: None.

## Review notes (for App Review)

Liraydhas does not require an account. To exercise full functionality:
1. Open the app — it lands on onboarding.
2. Enter any date of birth, time of birth, and city (e.g. "Steve
   Jobs: 1955-02-24, 19:15, San Francisco").
3. Tap "Compute". The app navigates to the Today tab.
4. The Today tab shows a daily paragraph generated server-side via
   Anthropic Claude. The Chart, Arcs, and Polarity tabs render fully
   on-device with no further network calls.

The "server" referenced is a Next.js Vercel deployment owned by the
developer. It proxies prompt requests to Anthropic and forwards no
PII (only the derived chart numbers).

## Screenshots (6.7" iPhone, required)

[ ] 1. Today tab — daily paragraph + sky visual
[ ] 2. Chart tab — body chart + narrative
[ ] 3. Arcs tab — D3 cycles
[ ] 4. Polarity tab — rising/descending bars
[ ] 5. Onboarding — birth data entry

Capture from device or simulator at 1290 × 2796.
