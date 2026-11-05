/**
 * Mythri Sanctuary - Progressive Web App Service Worker
 * Production-ready caching strategy designed for Next.js App Router
 * Version: v5 (Purges all legacy v1..v4 caches and eliminates chunk reload loops)
 */

const CACHE_VERSION = 'mythri-pwa-v5';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Core static offline assets (NEVER include '/' or HTML pages in precache to prevent serving stale versions)
const PRECACHE_ASSETS = [
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png'
];

// URLs/Patterns to NEVER cache (Always Network Only)
const BYPASS_PATTERNS = [
  /\/api\//i,                     // Backend API endpoints & rewrites
  /\/health/i,                    // Health checks
  /trycloudflare\.com/i,          // Cloudflare tunnels
  /loca\.lt/i,                    // LocalTunnel
  /pinggy\.link/i,                // Pinggy tunnels
  /onrender\.com/i,               // Render backend instances
  /identitytoolkit\.googleapis/i, // Firebase Auth
  /securetoken\.googleapis/i,     // Firebase Tokens
  /googletagmanager\.com/i,       // GA
  /google-analytics\.com/i,       // GA
  /doubleclick\.net/i,            // Ads/Analytics
  /google\.co/i,                  // Google Ads/Analytics
  /cloudflare/i,                  // Tunnel endpoints
  /sarvam/i,                      // AI voice & speech
  /openai/i,                      // AI streaming
  /socket\.io/i,                  // WebSockets
  /\/ws\//i                       // WebSockets
];

// Install: precache offline assets and skip waiting immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Precache partial error:', err);
      });
    })
  );
});

// Activate: purge ALL legacy/stale caches from previous versions and claim all open tabs
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== STATIC_CACHE && name !== RUNTIME_CACHE) {
            console.log('[SW] Purging outdated cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Ignore non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // 2. Ignore non-HTTP/HTTPS schemes (e.g. chrome-extension:)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 3. Bypass sensitive, dynamic, auth, and backend API routes
  if (BYPASS_PATTERNS.some((pattern) => pattern.test(url.href))) {
    return;
  }

  // 4. Audio/Video streaming and Range requests (Network Only to prevent range errors)
  if (request.headers.has('range') || url.pathname.endsWith('.webm') || url.pathname.endsWith('.mp3') || url.pathname.endsWith('.wav')) {
    return;
  }

  // 5. Next.js Static Chunks (/_next/static/*): Let browser HTTP cache handle directly
  // CRITICAL FIX: NEVER serve stale-while-revalidate for Next.js JS chunks!
  // Next.js chunks are immutable with content hashes. Stale chunks cause ChunkLoadError reload loops across deploys.
  if (url.pathname.startsWith('/_next/static/')) {
    return; // Pass through to native browser cache and network
  }

  // 6. HTML Page Navigation: Network-First, NEVER fall back to stale '/' HTML
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Do not cache HTML navigation responses to ensure users always see the latest deployed app version
          return networkResponse;
        })
        .catch(async () => {
          // If completely offline, try exact match for this specific path only
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          return new Response(
            `<!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>Offline | Mythri Sanctuary</title>
                <style>
                  body { font-family: system-ui, sans-serif; background: #2A1D18; color: #FAF6EE; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; text-align: center; }
                  .card { background: rgba(255, 255, 255, 0.08); padding: 32px; border-radius: 24px; border: 1px solid rgba(255, 255, 255, 0.15); max-width: 420px; }
                  h1 { font-family: serif; font-size: 24px; margin-bottom: 12px; }
                  p { color: #E0D4C8; font-size: 14px; line-height: 1.6; }
                  button { margin-top: 20px; padding: 10px 24px; border-radius: 9999px; background: #FAF6EE; color: #2A1D18; border: none; font-weight: 600; cursor: pointer; }
                </style>
              </head>
              <body>
                <div class="card">
                  <h1>Sanctuary is Paused</h1>
                  <p>You appear to be offline. Reconnect to the internet to resume your quiet space with Mythri.</p>
                  <button onclick="window.location.reload()">Retry Connection</button>
                </div>
              </body>
            </html>`,
            {
              status: 503,
              headers: { 'Content-Type': 'text/html; charset=utf-8' }
            }
          );
        })
    );
    return;
  }

  // 7. Fonts (Google Fonts, etc.): Stale While Revalidate
  if (url.origin.includes('fonts.googleapis.com') || url.origin.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => null);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 8. Static Images, Icons, Models: Stale While Revalidate
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/images/')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => null);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Default: Network with Runtime Cache Fallback
  event.respondWith(
    fetch(request)
      .then((networkResponse) => networkResponse)
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response('Network error occurred.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' }
        });
      })
  );
});

// Listen for skip waiting messages from UI
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
