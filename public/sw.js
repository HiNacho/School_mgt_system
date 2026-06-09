// PWA Offline-First Service Worker

const CACHE_NAME = 'schoolresult-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/login',
  '/dashboard',
  '/favicon.ico',
  '/globe.svg',
  '/window.svg',
  '/file.svg'
];

// 1. Install event: Cache essential shells
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline shell assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate event: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch event: Network-First for HTML/RSC documents, Cache-First for static assets
self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);

  // Skip caching for backend API requests
  if (requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Fallback for API offline scenarios
        return new Response(
          JSON.stringify({ 
            error: 'You are currently offline. Local cache database queued changes.', 
            offline: true 
          }), 
          { 
            headers: { 'Content-Type': 'application/json' },
            status: 503 
          }
        );
      })
    );
    return;
  }

  // Next.js React Server Component (RSC) and Prefetch payloads: Network-Only (do not cache)
  const isRSC = event.request.headers.has('RSC') || 
                event.request.headers.has('Next-Router-Prefetch') || 
                event.request.headers.has('Next-Router-State-Tree') ||
                requestUrl.pathname.startsWith('/_next/data/');

  if (isRSC) {
    event.respondWith(fetch(event.request));
    return;
  }

  const acceptHeader = event.request.headers.get('accept') || '';
  const isHTML = acceptHeader.includes('text/html') || event.request.mode === 'navigate';

  // HTML Documents: Network-First to prevent stale shell/chunk name mismatch crashes
  if (isHTML) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Only cache explicit static landing/dashboard shell URLs
          const isShell = ASSETS_TO_CACHE.includes(requestUrl.pathname);
          if (networkResponse.status === 200 && isShell) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return caches.match('/login').then((loginRes) => {
              return loginRes || caches.match('/') || new Response('Offline mode: Connect to internet.', { status: 503 });
            });
          });
        })
    );
    return;
  }

  // Static Assets (CSS, JS, Fonts, Images): Cache-First
  const isStaticAsset = 
    requestUrl.pathname.startsWith('/_next/static/') ||
    requestUrl.pathname.endsWith('.js') ||
    requestUrl.pathname.endsWith('.css') ||
    requestUrl.pathname.endsWith('.png') ||
    requestUrl.pathname.endsWith('.jpg') ||
    requestUrl.pathname.endsWith('.jpeg') ||
    requestUrl.pathname.endsWith('.svg') ||
    requestUrl.pathname.endsWith('.ico') ||
    requestUrl.pathname.endsWith('.woff2') ||
    (requestUrl.pathname.endsWith('.json') && !requestUrl.pathname.startsWith('/api/'));

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => {
          return new Response('Asset not available offline', { status: 404 });
        });
      })
    );
    return;
  }

  // All other GET requests (fallback): Network-Only
  event.respondWith(fetch(event.request));
});
