# Protecting Liraydhas (IP, trademark, App Store legalities)

> **I am not your lawyer.** I'm a coding assistant. This document is a
> plain-English overview based on widely available public information,
> not legal advice. For anything you're going to sign or file, talk to
> an actual IP attorney — even a one-hour consultation ($150–400) is
> worth it before you make decisions you can't undo. Many IP lawyers
> offer free 15-minute intro calls.

This file gives you the lay of the land so you can have those
conversations more efficiently.

---

## What you already own automatically

**The instant you write code or design something, you own it.** In the
US (and most countries), this is **copyright** — and it's automatic.
You don't have to file anything for the basic protection to exist.

What's covered by your automatic copyright:

- **Your source code** (every file in this repo).
- **Your written copy** (everything in `/lib/voice.ts`, the daily
  questions, all the text in /learn, /about, /privacy, etc.).
- **Your specific visual designs** (the exact look of the body chart,
  the arcs view, the polarity bars, the color palette, your icon,
  your typography choices).
- **The way you organized the user flow** (the specific combination of
  features, the way /saved works, the inline reflection nudge, etc.).

The git history on your private repo timestamps everything. Keep the
repo private until you ship if you want the strongest "I made this
first" argument.

What's **NOT** covered by copyright:

- **Ideas in the abstract.** Copyright covers your specific *expression*
  of an idea. Someone could build "an app that draws lifelong cycle arcs
  in a different visual style" and you couldn't stop them under
  copyright law.
- **Underlying math.** The astronomical math, the Human Design gate
  mappings, the polarity-half-period idea — these are facts/methods
  in the public domain.
- **The fact that you combined astrology + Human Design + life cycles**
  in one app. Concepts and feature lists aren't copyrightable.

---

## Trademarks (strong protection for the name)

A **trademark** protects the name + logo + look-and-feel that identifies
your product in the marketplace. This is what stops a competitor from
shipping a clone called "Lyraydhas" or using your wine-and-cream color
palette to confuse users about which app is yours.

### Do you need to file?

For an App Store submission, **no, you don't need a registered
trademark before launching.** You have an unregistered common-law
trademark in the name "Liraydhas" the moment you start using it
commercially. Apple won't ask for trademark proof.

But filing gives you stronger ammunition if someone copies you:

- **Federal registration** (USPTO Form TEAS Plus, ~$250 per class)
  gives you a presumption of nationwide ownership, lets you sue in
  federal court, and lets you put the ® symbol on the app.
- **Without registration**, you only have rights in the geographic
  areas where you actually use the name, and enforcing them is harder.

For a daily-use app you plan to grow: **filing is a good idea.**
File in Class 9 (downloadable software / mobile applications) and
Class 42 (software-as-a-service) if you also run a web version.

### How to file

1. Search the existing USPTO database at <https://tmsearch.uspto.gov/>
   to make sure "Liraydhas" isn't already taken. "Liraydhas" is unusual
   enough that it should be clear, but check anyway.
2. File via TEAS at <https://www.uspto.gov/trademarks/apply>.
3. Or pay a service like LegalZoom / Trademark Engine ~$400 to do
   the form work. Worth it the first time.

Processing takes 8–12 months. Once filed you can use ™ immediately;
® waits for registration to complete.

### What you can trademark

- ✅ The name "Liraydhas"
- ✅ Your logo (the concentric circles + cardinal cross + wine dot)
- ✅ A distinctive tagline if you settle on one
- ❌ Generic feature descriptions ("daily reading", "body chart")
- ❌ Functional UI patterns (a heatmap calendar, a bar chart)

---

## Patents (mostly not useful here, honestly)

A **utility patent** covers novel inventions. For software UI it's
extremely hard to get a patent on visual concepts in 2026 — the *Alice*
Supreme Court decision plus subsequent USPTO guidance has made software
patents narrow and expensive.

For your specific concerns:

- **The arc visualization.** You can't patent "drawing cycles as arcs
  on a timeline" — too abstract, and similar visualizations existed for
  decades (think Spirograph, gene-expression heatmaps, life-stage
  graphics). What you DO own is your specific aesthetic execution and
  the code that produces it (both copyrighted automatically).
- **The polarity stack.** Same story. The concept of "every cycle has
  a rising and descending half" is a Human Design / astrological idea
  in the public domain. Your specific visual + interpretive layer is
  yours via copyright.

If you genuinely think the way you compute or display something is
*novel and non-obvious*, talk to a patent attorney. Filing is ~$10k+
and takes 2–3 years. For a v1 indie app, almost never worth it.

A **design patent** ($1k–2k) covers ornamental design — the specific
shape and look of an icon or screen. These are easier to get than
utility patents and could potentially cover your distinctive arc layout
or chart icon. If you're seriously worried about visual copying, it's
worth the attorney consultation.

---

## Trade secrets (your strongest protection for "ideas")

The strongest legal protection for the *unique combinations and
algorithms* you've built — like the way you compute the daily
"texture" question pool, your specific channel rendering, or your
voice prompt structure — is **trade secret** law.

A trade secret is anything that:

1. **Has commercial value because it's not generally known.**
2. **You take reasonable steps to keep secret.**

Reasonable steps include:

- Keeping the repo private (which you already do).
- Adding NDAs if you ever hire contractors.
- Not posting your internals on Twitter / Reddit.

If someone steals it through illegitimate means (breach of NDA,
hacking, employee leak), trade secret law gives you a lawsuit. If
someone independently reverse-engineers your visible app, trade secret
law won't help — that's why copyright + trademark complement it.

---

## What the App Store actually does and doesn't take

Apple's submission terms (Developer Program License Agreement) are
explicit:

- **You retain ownership** of your code, content, and IP. Apple does
  not get rights to your app's "ideas."
- **Apple gets a license** to distribute the app and use your
  marketing materials (screenshots, description, icon) to promote the
  store. They can use your screenshots in App Store ads.
- **Apple does not see your source code.** They review the compiled
  binary. They don't get access to your repo. Your code stays yours.
- **Anything you post publicly in App Store Connect** (description,
  keywords, screenshots) becomes searchable to anyone, including
  competitors. They can read it, see the screenshots, and learn what
  your features are. That's just how the public store works.

**App Review can't steal your idea.** Apple has no commercial interest
in cloning indie productivity / lifestyle apps. There have been a few
notorious "Sherlocking" cases over the years (Apple shipping a
Spotlight feature that overlapped with a popular third-party app), but
those have been around system-level features, not niche lifestyle apps.

**Competitors absolutely can see your app and clone the look.** This
is the real risk — not Apple. Defenses:

1. **Trademark the name + logo** so they can't ride on your brand.
2. **Move fast.** Ship updates; build a user base. The first mover
   with a real audience usually wins in lifestyle/journaling apps
   even after copies appear.
3. **Make the UX irreplaceable.** Pin features in users' habits
   (notifications, the journal, "anniversary today"). Switching costs
   are your moat.

---

## Privacy laws you need to comply with

Some of these are App Store gates; others are real legal exposure.

### Apple's App Privacy nutrition label

Required for every App Store submission. You declare what data your
app collects and what it's used for. Honest declarations:

- **Birth blueprint** (date, time, place + derived chart): collected,
  sent to your server, **not linked to user identity**, used for "App
  Functionality."
- **Push subscription token**: collected, stored on your server, not
  linked to identity, used for "App Functionality."
- **Journal text, photos, voice notes, tags, pins**: **NOT collected**
  (stays on device).
- **Crash logs / analytics**: NOT collected (you have none).

### GDPR (EU users)

If you have any EU users (you will, eventually), GDPR applies.
Liraydhas's design is mostly GDPR-friendly because data lives on the
user's device. Your only GDPR-relevant data flows are:

- The birth blueprint sent to Anthropic via your server (a processor
  relationship; Anthropic has its own GDPR compliance).
- The push token + local hour stored in Vercel KV.

Your `/privacy` page already covers the basics. For EU compliance:

- Add a Data Processing Addendum link if anyone formally asks (rare for
  consumer apps).
- The "delete all my data" button satisfies the right-to-erasure
  obligation.

### COPPA (kids under 13)

Your privacy page already states "Liraydhas is not directed to
children under 13 and we do not knowingly collect data from them."
That's the standard disclaimer. As long as you don't market to kids
and don't ask "how old are you?" in a way targeted at children, you're
fine.

### CCPA (California users)

Similar to GDPR. The "delete all my data" button covers the right to
deletion. You don't sell user data → most CCPA obligations don't
apply.

---

## Practical recommendations (in priority order)

1. **File a federal trademark on "Liraydhas"** in Class 9 (and 42 if
   you keep the web app). ~$250 + your time, or ~$400 via a service.
   *This is the single best legal investment.*
2. **Keep the repo private** until launch. Stops competitors from
   straight-copying your code.
3. **Add a `LICENSE` or "all rights reserved" note** to the repo
   root once you go public, so it's explicit you're not open-source.
4. **Add a copyright footer** to /about: "© Year Liraydhas. All rights
   reserved." This is symbolic but useful as evidence.
5. **Document your design timeline.** Screenshot key UI iterations
   with dates; keep the git history of `lib/voice.ts`, the arcs
   component, the polarity bars. If someone copies later, this is
   your prior-art evidence.
6. **Don't post your code on Twitter / Discord / Reddit.** Casual
   "look at this clever bit" posts can undermine trade secret claims.
7. **If you sell or partner**, get an NDA from the other side BEFORE
   showing your roadmap / unreleased designs.
8. **For real legal advice**, find an IP attorney via your state bar's
   referral service. Avoid the high-volume "do you need a trademark?"
   ads. A solo practitioner who specializes in startup IP is usually
   the right size.

---

## Quick FAQ

**Q: Can someone clone my arcs visualization?**
A: Legally, yes — the underlying idea (drawing cycles as arcs) is in
the public domain. They CAN'T copy your specific code or your distinctive
visual style without infringing copyright. Practically, your moat is
brand and traction.

**Q: Can App Review reject me for using "trademarked" astrology terms?**
A: "Astrology" / "Human Design" / "zodiac" are generic terms, not
protected trademarks of any one company. The phrase "Human Design"
is a trademark of Jovian Archive in some contexts; using it
descriptively to explain what your app computes is generally fine
(nominative fair use) but if you're worried, your app could refer to
it as "your body chart" or "your design" (which your voice spec
already does). I checked — the live app voice strategy is already to
not name the system, which sidesteps this entirely.

**Q: What if someone reverse-engineers my JS bundle?**
A: Your compiled JS in the .ipa is technically inspectable by anyone
who jailbreaks an iPhone. In practice, the static export is minified
and uglified, and reading minified React is painful. For real
protection of any future server-side secrets, keep them in environment
variables — which you already do.

**Q: Should I incorporate (LLC / corporation) before launching?**
A: Not strictly required for an App Store launch. Apple accepts
individual developer accounts. But forming an LLC ($100–500 depending
on state) shields your personal assets if you ever get sued. Worth
doing once you have meaningful revenue. NOT urgent for a v1.

**Q: How do I price the app?**
A: Not legal advice but: most successful daily-use lifestyle apps go
free-with-subscription. A free tier gets users onboarded, then
$5–10/month for unlimited LLM readings or unlimited journal photos.
Apple takes 15–30%. None of this is decided yet — ship free first,
add the subscription path later via App Store In-App Purchase.

---

## TL;DR for you

- **Copyright on your code, copy, designs:** automatic, free, already
  yours.
- **Trademark on "Liraydhas":** file with USPTO, ~$250, gives you the
  strongest weapon against copycats.
- **Patents:** mostly not worth it for this app.
- **App Store:** doesn't take your IP. Competitors might copy your
  visible features; brand + speed are your defense.
- **Privacy:** the app is already designed for it. Honest nutrition
  label, /privacy page covers the basics.
- **For anything you'd sign or file:** talk to an actual IP lawyer.
