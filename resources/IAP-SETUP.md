# In-App Purchase setup checklist

The code side of subscriptions is fully built. This file is the
everything-outside-the-code checklist — App Store Connect, Vercel env
vars, and how to test. Work top to bottom; nothing here requires
writing code.

## What's already done in the repo

- `cordova-plugin-purchase` is in package.json. `npx cap sync ios`
  (part of `npm run ios:prep` / `ios:build`) installs the native pod
  automatically — nothing manual in Xcode.
- Purchase + restore flow: `lib/iap/storekit.ts`
- Server-side validation (renewal-aware, sandbox-aware, fail-closed):
  `app/api/iap/validate/route.ts`
- Paywall shows Apple's localized prices once the catalog loads.
- Entitlement reconciles at every app launch (renewals extend Pro,
  lapses downgrade to free).

## 1 · App Store Connect — create the subscriptions

App Store Connect → your app → **Monetization → Subscriptions**.

1. Create one Subscription Group, e.g. `Liraydhas Pro`.
2. Inside it, create TWO auto-renewable subscriptions with EXACTLY
   these Product IDs (they must match `PRODUCT_IDS` in
   `lib/subscription.ts`, character for character):

   | Product ID                        | Duration | Suggested price |
   |-----------------------------------|----------|-----------------|
   | `com.liraydhas.app.pro.monthly`   | 1 month  | $4.99           |
   | `com.liraydhas.app.pro.annual`    | 1 year   | $39.99          |

3. For each: add the localized display name + description, pick the
   price, and upload a review screenshot (a screenshot of the /pro
   paywall screen is exactly what they want).
4. Both subscriptions must be attached to the app version you submit
   for review (App Store Connect prompts for this on the version page
   under "In-App Purchases and Subscriptions").

## 2 · App Store Server API key (for validation)

App Store Connect → **Users and Access → Integrations → In-App
Purchase** → generate an API key.

You get three things — put them in Vercel (Project → Settings →
Environment Variables, Production scope):

| Vercel env var           | Value                                              |
|--------------------------|----------------------------------------------------|
| `APP_STORE_KEY_ID`       | the 10-character Key ID                            |
| `APP_STORE_ISSUER_ID`    | the Issuer ID (a UUID, shown on the same page)     |
| `APP_STORE_PRIVATE_KEY`  | the FULL contents of the downloaded .p8 file, including the BEGIN/END lines. In Vercel, paste it as-is with real newlines. |
| `APP_STORE_BUNDLE_ID`    | `com.liraydhas.app`                                |

⚠️ The .p8 can only be downloaded ONCE from Apple — save the file
somewhere safe.

Without these four vars, /api/iap/validate returns 501 in production
and purchases will not grant Pro. (In local dev it stubs to "pro" so
the UI can be tested without an Apple account.)

## 3 · Xcode capability

After `npx cap sync ios`, open Xcode → target **App** → Signing &
Capabilities → **+ Capability → In-App Purchase**. (One click; the
plugin needs the entitlement.)

## 4 · Testing before release

1. App Store Connect → Users and Access → **Sandbox Testers** →
   create a sandbox Apple ID (any fake-ish email works).
2. On your iPhone: Settings → App Store → scroll to SANDBOX ACCOUNT →
   sign in with that tester.
3. Run the app from Xcode on the device, open /pro, buy. The payment
   sheet says [Environment: Sandbox] and no real money moves.
4. Sandbox subscriptions auto-renew on a compressed clock (a month ≈
   5 minutes, up to 6 renewals then auto-expire) — perfect for
   watching the boot-time revalidation extend and then lapse Pro.

The server handles sandbox automatically (production 404 → sandbox
retry), which is also what makes App Review's own purchase tests
pass — reviewers always buy in sandbox.

## 5 · Guideline notes (why review should pass)

- 3.1.1 — all digital-goods payments go through StoreKit. ✓
- 3.1.1 — "Restore Purchases" is on the paywall. ✓
- 3.1.2 — auto-renewal terms + cancel instructions are shown on the
  paywall and the /pro FAQ. ✓ (Also paste your privacy policy URL and
  terms into the App Store Connect subscription metadata fields —
  Apple checks those exist.)
- The local 7-day trial is a soft feature unlock, not a StoreKit
  offer, so it needs no App Store Connect configuration.
