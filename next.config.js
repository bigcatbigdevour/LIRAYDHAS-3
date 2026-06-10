/**
 * Next.js config — two build modes:
 *
 * 1. SERVER (default): standard next build → Vercel deployment with
 *    server-rendered routes + /api/* endpoints. This is what
 *    `npm run build` and `npm run dev` use.
 *
 * 2. STATIC (set BUILD_TARGET=ios): produces a static `out/` directory
 *    that ships inside the App Store binary. `npm run ios:build` sets
 *    the env var. /api/* routes are excluded — the iOS app calls them
 *    on the live Vercel deployment via NEXT_PUBLIC_API_BASE.
 *
 * The static build is what gets us past App Store guideline 4.2
 * ("apps must provide unique, useful, lasting entertainment value
 * beyond a webpage"). With a static export the JS/HTML lives in the
 * .ipa and the app works the first time even before any network
 * round trip.
 */

const isIosBuild = process.env.BUILD_TARGET === 'ios';

// Build-time stamps surfaced on /about. The git SHA resolves at build
// time; if we're inside a Vercel build, Vercel sets the env var for us.
function gitShortSha() {
  if (process.env.NEXT_PUBLIC_BUILD_COMMIT) {
    return process.env.NEXT_PUBLIC_BUILD_COMMIT;
  }
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
  }
  try {
    const { execSync } = require('child_process');
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'dev';
  }
}

const buildVersion =
  process.env.NEXT_PUBLIC_BUILD_VERSION ||
  require('./package.json').version ||
  '0.0.0';
const buildCommit = gitShortSha();
const buildDate = process.env.NEXT_PUBLIC_BUILD_DATE || new Date().toISOString();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BUILD_VERSION: buildVersion,
    NEXT_PUBLIC_BUILD_COMMIT: buildCommit,
    NEXT_PUBLIC_BUILD_DATE: buildDate,
  },
  ...(isIosBuild
    ? {
        // Static export. App Router static export works for everything
        // except /api routes and server-only features. The /api routes
        // stay on Vercel; the iOS app fetches them from NEXT_PUBLIC_API_BASE.
        output: 'export',
        // next/image needs to be unoptimized for static export.
        images: { unoptimized: true },
        // Strip trailing slashes so iOS file:// URLs don't 404.
        trailingSlash: true,
      }
    : {}),
};

module.exports = nextConfig;
