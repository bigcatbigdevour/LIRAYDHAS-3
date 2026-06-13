/* eslint-disable no-restricted-globals */
/**
 * Liraydhas service worker — offline-first shell + last-known-good
 * fallback for the LLM endpoints.
 *
 * Two caching strategies:
 *   1. App shell (HTML routes, _next static assets, icon, manifest):
 *      network-first, fall back to cache. This means a user with no
 *      connection can still open /today / /saved / /chart and see the
 *      last version that loaded.
 *   2. LLM responses (/api/daily, /api/polarity, /api/narrative):
 *      stale-while-revalidate. If the network call fails the cached
 *      previous response is served — yesterday's reading is better
 *      than a blank screen.
 *
 * IMPORTANT: do NOT cache POST bodies. The Cache API requires GET. For
 * the LLM endpoints we wrap the POST + body into a synthetic GET-style
 * cache key (URL + a hash of the JSON body). Falls back to running the
 * POST live if cache lookup fails.
 */

const VERSION = 'liraydhas-v2';
const SHELL_CACHE = `${VERSION}-shell`;
const READING_CACHE = `${VERSION}-readings`;

// Routes worth pre-caching at install time. Everything else gets cached
// lazily on first visit.
const SHELL_URLS = [
  '/',
  '/today',
  '/saved',
  '/chart',
  '/polarity',
  '/arcs',
  '/year',
  '/learn',
  '/about',
  '/onboarding',
  '/compat',
  '/pro',
  '/support',
  '/privacy',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  // Take over the next page load immediately.
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      Promise.all(
        SHELL_URLS.map((url) =>
          cache.add(url).catch(() => {
            // Some routes may 404 in dev — don't break install on those.
          }),
        ),
      ),
    ),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Take control of every existing client so cached responses
      // immediately apply.
      await self.clients.claim();
      // Clean up old-version caches.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(VERSION))
          .map((k) => caches.delete(k)),
      );
    })(),
  );
});

// FNV-1a 32-bit hash, returned as a hex string. Used to key cached
// LLM POST responses by their request body.
function hashBody(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16);
}

const LLM_ENDPOINTS = new Set([
  '/api/daily',
  '/api/polarity',
  '/api/narrative',
  '/api/year',
  '/api/synastry',
  // /api/ask is intentionally NOT cached — each question is different
  // and a stale answer to "should I quit my job" would be worse than a
  // useful error message.
]);

// === Push notifications ===
// The server-sent push payload should be JSON with at minimum:
//   { title, body, url? }
// `url` defaults to /today if absent.
self.addEventListener('push', (event) => {
  let data = { title: 'Liraydhas', body: 'Your reading is ready.', url: '/today' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // payload wasn't JSON — fall back to a plain text body
    try {
      const txt = event.data ? event.data.text() : '';
      if (txt) data.body = txt;
    } catch { /* ignore */ }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/apple-icon',
      badge: '/icon',
      data: { url: data.url || '/today' },
      // Keep the notification quiet — this app's voice doesn't shout.
      silent: false,
      requireInteraction: false,
    }),
  );
});

// Clicking the notification focuses an existing tab on the right route,
// or opens a new one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/today';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.endsWith(url) && 'focus' in w) return w.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin requests; everything else passes through.
  if (url.origin !== self.location.origin) return;

  // LLM endpoints: stale-while-revalidate with body-aware keys.
  if (req.method === 'POST' && LLM_ENDPOINTS.has(url.pathname)) {
    event.respondWith(handleLlmPost(req));
    return;
  }

  // Everything else (GET requests for the shell + static assets):
  // network-first, fall back to cache.
  if (req.method === 'GET') {
    event.respondWith(handleGet(req));
    return;
  }
});

async function handleGet(req) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const fresh = await fetch(req);
    // Only cache successful, basic-type responses to keep things tidy.
    if (fresh && fresh.ok && fresh.type === 'basic') {
      cache.put(req, fresh.clone()).catch(() => {/* quota etc. — ignore */});
    }
    return fresh;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    // Last resort: try the closest matching route shell.
    const fallback = await cache.match('/today');
    if (fallback) return fallback;
    return new Response('offline', { status: 503, statusText: 'offline' });
  }
}

async function handleLlmPost(req) {
  const body = await req.clone().text();
  const cacheKey = new Request(`${req.url}?__body=${hashBody(body)}`, {
    method: 'GET',
  });
  const cache = await caches.open(READING_CACHE);
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.ok) {
      cache.put(cacheKey, fresh.clone()).catch(() => {/* ignore */});
    }
    return fresh;
  } catch {
    const cached = await cache.match(cacheKey);
    if (cached) {
      // Mark the response so the client can surface "offline · cached"
      // if it wants to.
      const cloned = cached.clone();
      const headers = new Headers(cloned.headers);
      headers.set('X-Liraydhas-Cache', 'offline');
      const txt = await cloned.text();
      return new Response(txt, {
        status: cloned.status,
        statusText: cloned.statusText,
        headers,
      });
    }
    return new Response(
      JSON.stringify({ error: 'offline · no cached reading available' }),
      {
        status: 503,
        headers: { 'content-type': 'application/json' },
      },
    );
  }
}
