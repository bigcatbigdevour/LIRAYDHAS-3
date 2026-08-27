/**
 * Build identifiers surfaced to the user in /about and useful for
 * App Review bug reports.
 *
 * These are populated at build time from environment variables:
 *
 *   NEXT_PUBLIC_BUILD_VERSION — short marketing version (e.g. "0.1.0").
 *                               Defaults to package.json version.
 *   NEXT_PUBLIC_BUILD_COMMIT  — short git SHA. Vercel sets
 *                               VERCEL_GIT_COMMIT_SHA automatically;
 *                               we surface a 7-char prefix.
 *   NEXT_PUBLIC_BUILD_DATE    — ISO timestamp of the build.
 *
 * The values are inlined into the client bundle at build time. Bare
 * env access here (instead of a small helper) keeps Next.js's bundler
 * able to constant-fold them.
 */

export const BUILD_VERSION =
  process.env.NEXT_PUBLIC_BUILD_VERSION || '0.1.0';

export const BUILD_COMMIT =
  process.env.NEXT_PUBLIC_BUILD_COMMIT ||
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
  'dev';

export const BUILD_DATE =
  process.env.NEXT_PUBLIC_BUILD_DATE || '';

export function buildLabel(): string {
  const date = BUILD_DATE ? BUILD_DATE.slice(0, 10) : '';
  const parts = [`v${BUILD_VERSION}`, BUILD_COMMIT, date].filter(Boolean);
  return parts.join(' · ');
}
