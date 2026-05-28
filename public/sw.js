// PWA Offline-First Service Worker

const CACHE_NAME = 'schoolresult-cache-v1';
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

// 3. Fetch event: Network-first for dynamic content, Cache-first for static shells
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Skip caching for backend API requests and prisma databases
  if (requestUrl.pathname.startsWith('/api/') || requestUrl.pathname.startsWith('/_next/data/')) {
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

  // Cache-first then Network strategy for static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached shell, update cache in background
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {/* Ignore network errors offline */});
        
        return cachedResponse;
      }

      // If not cached, fetch from network
      return fetch(event.request).then((response) => {
        // Cache new static pages dynamically
        if (response.status === 200 && event.request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Return offline page fallback if network fails
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/login');
        }
      });
    })
  );
});
