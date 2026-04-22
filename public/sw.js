const CACHE_NAME = 'courseday-v2';

// Never cache these paths
const SKIP_PREFIXES = ['/auth/', '/api/'];

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

async function broadcastDrainRequest() {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((client) => {
    client.postMessage({ type: 'drain-offline-queue' });
  });
}

self.addEventListener('sync', (event) => {
  if (event.tag !== 'drain-offline-queue') return;
  event.waitUntil(broadcastDrainRequest());
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'drain-offline-queue') return;
  event.waitUntil(broadcastDrainRequest());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never cache auth routes or API calls
  if (SKIP_PREFIXES.some((p) => url.pathname.startsWith(p))) return;

  // Cache-first for Next.js static assets (immutable, content-hashed)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      })
    );
    return;
  }

  // Network-first for pages — fall back to cache when offline
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
