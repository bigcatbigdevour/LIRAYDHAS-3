import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor config for wrapping Liraydhas as an iOS app.
 *
 * Two ways to point the iOS WebView at content:
 *
 * 1. REMOTE (default below): server.url points at the live Vercel
 *    deployment. The app is essentially a chromed-up version of
 *    the web app — all updates ship via Vercel without an App Store
 *    review. Simplest for TestFlight; some App Store risk for being
 *    "just a web app." Easy to swap to (2) later.
 *    webDir points at the checked-in `ios-www/` fallback (a "Connecting…"
 *    splash) which is only used if the remote URL is unreachable.
 *
 * 2. STATIC: comment out `server.url`, add `output: 'export'` to
 *    next.config.js, change `webDir` below to `'out'`, run
 *    `npm run build` (which now produces an `out/` directory), then
 *    `npm run ios:sync`. The app bundle ships the HTML/JS; fetches
 *    to `/api/*` need to be routed to a remote API base — set
 *    `NEXT_PUBLIC_API_BASE` for the build.
 */
// Toggle build mode via BUILD_TARGET=ios when running ios:build.
// In static mode the .ipa ships its own HTML/JS in `out/` and only the
// /api/* calls hit Vercel; in remote mode the WebView loads the
// Vercel URL directly (faster iteration, more App Review risk).
const STATIC_BUILD = process.env.BUILD_TARGET === 'ios';

const config: CapacitorConfig = {
  appId: 'com.liraydhas.app',
  appName: 'Liraydhas',
  // STATIC mode → `out/` is produced by `next build --output export`
  //   and contains every page as standalone HTML.
  // REMOTE mode → `ios-www/` is a lightweight fallback (a "Connecting…"
  //   splash) used only if server.url is unreachable.
  webDir: STATIC_BUILD ? 'out' : 'ios-www',
  // Only set server.url in remote mode. In static mode the app loads
  // its own bundled JS/HTML — App Store guideline 4.2 friendly.
  ...(STATIC_BUILD
    ? {}
    : {
        server: {
          url: 'https://liraydhas-3.vercel.app',
          cleartext: false,
        },
      }),
  ios: {
    backgroundColor: '#0a0a0a',
    // Allow inline media on iOS WebView
    allowsLinkPreview: false,
    // Use safe-area-inset CSS handling
    contentInset: 'always',
    scrollEnabled: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0a0a0a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      // Dark background; light text/icons
      style: 'DARK',
      backgroundColor: '#0a0a0a',
      overlaysWebView: true,
    },
    PushNotifications: {
      // Show the system banner even when the app is in the foreground.
      // "alert" is the visible banner; "sound" + "badge" round it out.
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
