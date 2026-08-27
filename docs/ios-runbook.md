# iOS runbook

Everything needed to get Liraydhas into TestFlight, then onto the
App Store. Assumes you have an Apple Developer account.

## 0. Prereqs (one-time, Mac only)

- macOS Sonoma or newer
- Xcode 15+ (from the Mac App Store; ~10 GB download)
- Command Line Tools: `xcode-select --install`
- CocoaPods: `sudo gem install cocoapods` (or `brew install cocoapods`)
- An Apple Developer Program enrollment ($99/yr) at
  https://developer.apple.com/programs/

## 1. Scaffold the iOS project (one-time)

From the repo root on your Mac:

```bash
npm install
npm run ios:add        # creates /ios directory with the native Xcode project
npm run ios:sync       # copies capacitor.config + plugins into native project
```

`/ios` is gitignored-by-convention for some teams; we keep it tracked
so that signing / icons / Info.plist edits live in version control.

## 2. Wire signing in Xcode

```bash
npm run ios:open       # opens /ios/App/App.xcworkspace in Xcode
```

In Xcode:
1. Click the `App` target in the left sidebar.
2. Go to *Signing & Capabilities*.
3. Check "Automatically manage signing".
4. Pick your team from the dropdown.
5. The Bundle Identifier is `com.liraydhas.app` (set via
   `capacitor.config.ts`). If that's taken on App Store Connect, change
   it in `capacitor.config.ts`, then `npm run ios:sync`.

## 3. Drop in icons and splash

The repo includes the `@capacitor/assets` generator and a `resources/`
drop-zone. From a Mac:

1. Convert `public/icon-512.svg` into `resources/icon.png` (1024 × 1024)
   and `resources/splash.png` (2732 × 2732, logo centered on `#0a0a0a`).
   See `resources/README.md` for one-liners using `rsvg-convert` +
   `magick`.
2. Run `npm run ios:assets` — it writes every size into
   `ios/App/App/Assets.xcassets/`.

If you'd rather not script it: open `public/icon-512.svg` in Figma or
Sketch and export at those sizes manually.

## 4. Build to your phone (free, no TestFlight needed)

1. Plug your iPhone in and unlock it.
2. In Xcode's top toolbar, pick your device from the dropdown.
3. Hit the play (▶) button.
4. First time: on the iPhone, go to *Settings → General → VPN &
   Device Management* and trust your developer cert.

You'll see Liraydhas open and load the live Vercel deployment in a
WebView.

## 5. Ship to TestFlight

1. In Xcode, *Product → Archive* (with "Any iOS Device (arm64)"
   selected as target).
2. Once the archive opens in the Organizer, click *Distribute App*.
3. Pick *App Store Connect* → *Upload* → *Next* → *Next* → *Upload*.
4. Go to https://appstoreconnect.apple.com → My Apps → (create a
   new app if needed) → TestFlight tab.
5. Add internal testers (just yourself + friends with Apple IDs).
6. Apple reviews the build for ~10–60 minutes. Once approved, you
   and the testers get an email with a TestFlight link.

## 6. Ship to App Store

When you're happy with TestFlight:

1. App Store Connect → Distribution → Prepare for Submission.
2. Fill in the listing using `docs/app-store-listing.md`.
3. Upload screenshots (6.7" iPhone, 1290 × 2796, at least 3).
4. Submit for review. Apple averages 24–48h for first review.

## Troubleshooting

- **WebView shows a blank black screen on launch**: check that
  `https://liraydhas-3.vercel.app` loads in mobile Safari. If Vercel
  is down, the app is down. (Solution later: ship the static export
  approach — see README's "Going fully offline".)
- **API calls fail with CORS**: confirm `lib/cors.ts` includes the
  `capacitor://localhost` regex. Capacitor sets the WebView origin
  to this scheme on iOS.
- **"No matching provisioning profile"**: usually resolved by
  toggling "Automatically manage signing" off and back on in Xcode.
- **"Bundle identifier already in use"**: change `appId` in
  `capacitor.config.ts`, run `npm run ios:sync`, then re-archive.
