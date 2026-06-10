# Mac setup → App Store submission

Everything you need to do once you sit down at a Mac. The codebase is
already ready — these are the platform-specific steps that have to run
on Apple's tooling.

---

## 0. One-time accounts + keys (do these BEFORE touching your Mac)

You can do these in any browser. They cost money or time so get them
queued up.

### Apple Developer Program

- [ ] Enroll at <https://developer.apple.com/programs/enroll/>. $99/yr.
      Personal enrollment is fine for a solo dev; organization enrollment
      requires a D-U-N-S number (slower).
- [ ] Wait for the approval email. Usually < 24 hours; can be a few days.

### APNs key for push notifications

- [ ] At <https://developer.apple.com/account/resources/authkeys/list>:
      **+** → name "Liraydhas APNs" → check **Apple Push Notifications
      service (APNs)** → Continue → Register.
- [ ] **Download the .p8** file. *Save it somewhere safe — Apple will
      only let you download it once.*
- [ ] Write down the **Key ID** (10 chars, shown next to the key name).
- [ ] Write down your **Team ID** (10 chars, top-right of the Apple
      Developer site).

### Vercel KV (persistent storage for push subscriptions)

- [ ] At Vercel dashboard → your Liraydhas project → **Storage** →
      **Create Database** → **KV** → connect to project.
- [ ] Vercel injects `KV_REST_API_URL` + `KV_REST_API_TOKEN` env vars
      automatically. Free tier covers ~30k commands/month.

### Push environment variables on Vercel

After cloning the repo locally and running `npm install`:

```bash
npm run vapid -- you@example.com
```

Paste the three output lines into Vercel → Settings → Environment
Variables (Production scope):

```
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com
```

Then add the APNs ones:

```
APNS_KEY_ID=ABCDE12345      # the 10-char Key ID
APNS_TEAM_ID=FGHIJ67890     # your 10-char Team ID
APNS_BUNDLE_ID=com.liraydhas.app
APNS_ENVIRONMENT=production
APNS_KEY_P8=...             # see below
```

For `APNS_KEY_P8`, paste the entire .p8 contents as one line with
literal `\n` between rows:

```bash
cat AuthKey_*.p8 | awk 'NR>1{printf "\\n"}{printf "%s", $0}'
```

Copy the output. **Redeploy** Vercel so the new env vars take effect.

---

## 1. Bootstrap the iOS project (on your Mac)

```bash
git pull                         # latest code
npm install                      # picks up Capacitor + plugin deps
sudo gem install cocoapods       # if you don't have it
npx cap add ios                  # generates the ios/ directory
```

`cap add ios` only needs to run once per machine. After that the iOS
folder is committed and tracked.

---

## 2. Build the App Store binary

```bash
npm run ios:build                # static export + cap sync + Info.plist patch
npm run ios:open                 # opens Xcode
```

In **Xcode** (this part is GUI):

- [ ] Click the `App` project in the sidebar → **Signing & Capabilities**.
- [ ] Set **Team** to your Apple Developer team.
- [ ] Click **+ Capability** → add **Push Notifications**.
- [ ] Click **+ Capability** → add **Background Modes** → check
      **Remote notifications** (so the OS wakes the app to deliver a push).
- [ ] Verify **Bundle Identifier** = `com.liraydhas.app`
      (or whatever you registered on Apple Developer).
- [ ] Verify **Display Name** = "Liraydhas".
- [ ] Verify **Deployment Info → iOS** is set to a sensible minimum
      (iOS 16.0 or later is safe).

---

## 3. Generate the app icons

```bash
npm run ios:assets
```

`@capacitor/assets` renders the SVG into every iOS size and drops them
into `ios/App/App/Assets.xcassets/AppIcon.appiconset/`. Open Xcode's
asset catalog to spot-check the result.

---

## 4. TestFlight (first)

In Xcode:

- [ ] **Product → Archive** (takes a few minutes; needs to compile for
      `arm64-apple-ios`).
- [ ] **Window → Organizer → Distribute App → App Store Connect →
      Upload**.
- [ ] Wait ~5 min for App Store Connect to process the binary.
- [ ] App Store Connect → **TestFlight** → enable your build → add
      yourself + 1–2 friends as **internal testers**.
- [ ] Install via the **TestFlight** iOS app on a real iPhone.

### Smoke test the install

Run the full loop on the real device:

- [ ] Onboarding with real birth data
- [ ] /today shows the LLM paragraph
- [ ] /chart shows the bodygraph
- [ ] /arcs scrubs smoothly
- [ ] /polarity bars render
- [ ] Tap "+ photo" on a /saved entry → camera prompt appears, attaches
- [ ] Tap "● record" → mic prompt appears, attaches
- [ ] /about → enable reminders → grant push permission → "send test" →
      notification fires on the home screen
- [ ] /about → "delete all my data" → double-confirms → wipes → lands
      on /onboarding

If any of those fail, fix the issue and re-archive before submitting.

---

## 5. App Store Connect submission

Go to <https://appstoreconnect.apple.com>.

- [ ] **+** → New App: name **Liraydhas**, bundle ID = same as Xcode,
      primary language English, SKU = anything, full access.
- [ ] **App Information**:
  - Subtitle: "A daily reading of the sky." (30 chars)
  - Category: Lifestyle (primary). Optional secondary: Healthcare & Fitness.
  - Content Rights: yes, no third-party content.
- [ ] **Pricing**: Free.
- [ ] **App Privacy**: paste from `appstore/review-notes.txt`. Honest
      declarations:
  - Birth blueprint → "User Content" → collected and sent to your
    server but not linked to identity. Used for "App Functionality."
  - Push token → "Identifiers (Device ID)" → collected → not linked
    → "App Functionality."
  - Photos, voice notes, journal text → "User Content" → **NOT
    collected** (stays on device).
- [ ] **Version Information**:
  - Description: paste `appstore/description.txt`
  - Keywords: paste `appstore/keywords.txt`
  - Promotional Text: paste `appstore/promotional-text.txt`
  - What's New: paste `appstore/whats-new.txt`
- [ ] **App Review Information**:
  - Notes: paste `appstore/review-notes.txt`, fill in your contact email.
  - Demo Account: leave blank (no login).
- [ ] **Screenshots** (1320×2868 portrait, iPhone 15/16 Pro Max).
      See `appstore/screenshot-plan.md` for the five strongest shots
      and the captions to paste alongside.
- [ ] **App Privacy Policy URL**: `https://liraydhas-3.vercel.app/privacy`.
- [ ] **Support URL**: a public page. Your GitHub repo's Issues tab is
      fine; or a simple landing page with a contact email.
- [ ] **Marketing URL**: optional — your Vercel deployment is fine.
- [ ] **Age Rating**: 12+ (Infrequent/Mild Mature/Suggestive Themes —
      astrology mentions life themes; rating up makes review easier).
- [ ] **Build**: select your TestFlight build.
- [ ] **Export Compliance**: check "uses only HTTPS" exemption. The
      `ITSAppUsesNonExemptEncryption=false` already in Info.plist
      handles this — pre-checked for you.

Submit for Review.

---

## 6. While Apple reviews (24–48h typical)

- [ ] Verify the cron is firing: visit
      `https://liraydhas-3.vercel.app/api/cron/daily-reading` from
      `curl` with `Authorization: Bearer <YOUR_CRON_SECRET>` and confirm
      it returns `{sent: N, ...}` (where N includes your TestFlight
      device).
- [ ] Watch Vercel logs for any unexpected errors after a real-device
      push.

---

## Common pitfalls

- **"Untrusted Developer" on first install via TestFlight** — Settings →
  General → VPN & Device Management → trust your team. Normal first
  time.
- **Build won't upload to App Store Connect** — usually a code-signing
  mismatch. In Xcode: Preferences → Accounts → your team → Download
  Manual Profiles. Then re-archive.
- **Push doesn't fire after granting permission** — likely an
  APNs_ENVIRONMENT mismatch (use `development` for Xcode-installed
  builds, `production` for TestFlight + App Store builds).
- **"Missing Push Notification Entitlement"** — Signing & Capabilities
  didn't get the Push Notifications capability. Add it; archive again.
- **Mic / camera prompt crashes the app** — the Info.plist usage
  strings weren't applied. Run `npm run ios:plist` and re-archive.
- **App Review rejects with "guideline 4.2 Minimum Functionality"** —
  this is the WebView wrapper concern. The static build
  (`npm run ios:build`) addresses it. If you somehow shipped the
  remote-URL config by accident, switch back and re-archive.
- **App Review rejects with "guideline 5.1.1(v) Account Deletion"** —
  the "delete all my data" button on /about is already wired. Make
  sure the reviewer notes (`appstore/review-notes.txt`) point at it.

---

## Updates after the first ship

For day-to-day code changes:

```bash
# 1. Make changes; test in `npm run dev`.
# 2. Push to main; Vercel deploys.
# 3. When ready to ship a new iOS build:
npm run ios:build              # static export + sync + plist
# Xcode → Product → Archive → Distribute → Upload.
# App Store Connect → submit new version.
```

If the change is JS/CSS only AND you're on remote mode (rare — the
static mode is App-Store-friendly), Vercel updates reach the app
instantly without a re-submit. But once you're on static mode (recommended
for App Review), every visual change ships as a new App Review.

A "What's New" copy line per release lives in `appstore/whats-new.txt`
— update it before each ship.
