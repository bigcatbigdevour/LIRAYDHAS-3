/**
 * Returns the base URL for /api/* calls.
 *
 * In the SERVER build, fetches go to the same origin — relative URLs
 * just work. In the STATIC build (BUILD_TARGET=ios), the JS lives
 * inside the .ipa and `fetch('/api/daily')` would try
 * `file:///api/daily` which doesn't exist. So static builds set
 * NEXT_PUBLIC_API_BASE at build time to point at the live Vercel
 * deployment (e.g. https://liraydhas-3.vercel.app), and every fetch is
 * rewritten to that origin.
 *
 * Usage:
 *   fetch(api('/api/daily'), { method: 'POST', ... })
 *
 * Returns the input unchanged when no base is configured (server build).
 */
export function api(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_BASE;
  if (!base) return path;
  if (!path.startsWith('/')) return path;
  // Trim trailing slash on base, leave one between base + path.
  const trimmed = base.replace(/\/+$/, '');
  return `${trimmed}${path}`;
}
