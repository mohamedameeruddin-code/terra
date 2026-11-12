const CACHE_NAME = 'terra-cache-v2.0.0';

// Essential assets to precache immediately during install
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './manifest.webmanifest',
  './icons/favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-180.png',
  './opencv/opencv.js',
];

// Install: precache app shell and static resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching offline app shell and assets...');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up older cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              console.log('[SW] Deleting obsolete cache:', name);
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: Network-first for navigation with offline fallback, Cache-first for assets
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle GET requests from our origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // 1. Navigation requests (HTML documents)
  if (request.mode === 'navigate') {
    event.respondWith(
      // Try network with 3s timeout
      Promise.race([
        fetch(request),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Network timeout')), 3000)
        ),
      ])
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // Fallback to cached index.html or offline.html
          return caches.match('./index.html').then((cached) => {
            return cached || caches.match('./offline.html');
          });
        })
    );
    return;
  }

  // 2. Static Assets (JS, CSS, images, wasm, json): Cache-first
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // If not in cache, fetch from network and store in cache
      return fetch(request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          // If asset not available offline
          if (request.destination === 'image') {
            return caches.match('./icons/icon-192.png');
          }
          return new Response('Offline resource not found', { status: 503 });
        });
    })
  );
});

// Listen for skip waiting signal
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

