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
const config: CapacitorConfig = {
  appId: 'com.liraydhas.app',
  appName: 'Liraydhas',
  // Lightweight fallback shipped in the .ipa. Used by WKWebView only if
  // server.url below is unreachable. Switch to 'out' when going STATIC.
  webDir: 'ios-www',
  // Comment out the server block when shipping a fully-offline static
  // build. With this present, the iOS app loads the Vercel URL.
  server: {
    url: 'https://liraydhas-3.vercel.app',
    cleartext: false,
  },
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
