// Bump this whenever the caching strategy changes. Activating a new version
// deletes every older cache, including entries left by earlier strategies.
const CACHE_VERSION = 'v3';
const CACHE_NAME = `math-flashcards-${CACHE_VERSION}`;

// App shell pages to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/settings',
  '/play',
  '/results',
  '/history',
  '/manifest.json',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
];

// ── Install: pre-cache known URLs ────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  // Activate immediately without waiting for existing tabs to close
  self.skipWaiting();
});

// ── Activate: remove stale caches ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  // Take control of all open clients immediately
  self.clients.claim();
});

// ── Fetch ────────────────────────────────────────────────────────────────────
// Pages and Next.js RSC payloads change with every deploy and reference that
// build's hashed chunk files, so they must come from the network when online.
// Serving them cache-first after a deploy points the app at chunks that no
// longer exist, which crashes it with "a client-side exception has occurred".
// Hashed files under /_next/static/ never change, so those are cache-first.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests from our own origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(networkFirst(request));
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    // Offline: fall back to the last copy we saw. RSC responses vary on
    // router headers, so ignore Vary rather than miss the cached copy.
    const cached = await cache.match(request, { ignoreVary: true });
    if (cached) return cached;
    throw err;
  }
}
