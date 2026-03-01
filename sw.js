/* ============================================================
   OAP House Visiting List - Service Worker
   Provides offline caching for the app shell
   ============================================================ */

const CACHE_NAME = 'oap-visit-v1.0.0';
const APP_SHELL = [
    './',
    './index.html',
    './dashboard.html',
    './admin.html',
    './config.js',
    './css/style.css',
    './js/supabase-client.js',
    './js/theme.js',
    './js/auth.js',
    './js/customers.js',
    './js/monthly.js',
    './js/images.js',
    './js/import-export.js',
    './js/admin.js',
    './js/pwa.js',
    './js/app-download.js',
    './js/app.js',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './manifest.json'
];

// External CDN resources to cache
const CDN_RESOURCES = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

// ---- INSTALL: cache app shell ----
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching app shell');
            return cache.addAll(APP_SHELL).catch((err) => {
                console.warn('[SW] Some files failed to cache:', err);
            });
        }).then(() => self.skipWaiting())
    );
});

// ---- ACTIVATE: clean old caches ----
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(
                keyList.filter(key => key !== CACHE_NAME)
                    .map(key => {
                        console.log('[SW] Removing old cache:', key);
                        return caches.delete(key);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// ---- FETCH: Stale-While-Revalidate for app shell, Network-First for API ----
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip Supabase API requests — always go to network
    if (url.hostname.includes('supabase.co')) return;

    // Skip chrome-extension and other schemes
    if (!['http:', 'https:'].includes(url.protocol)) return;

    // For app shell files: Cache-first, fallback to network
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                // Update cache in background (stale-while-revalidate)
                fetch(request).then((freshResponse) => {
                    if (freshResponse && freshResponse.ok) {
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, freshResponse.clone());
                        });
                    }
                }).catch(() => { }); // Ignore network errors
                return cachedResponse;
            }
            // Not in cache — fetch from network and cache
            return fetch(request).then((response) => {
                if (!response || !response.ok || response.type === 'opaque') {
                    return response;
                }
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, responseToCache);
                });
                return response;
            }).catch(() => {
                // Offline fallback
                if (request.destination === 'document') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});

// ---- BACKGROUND SYNC (optional) ----
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-data') {
        console.log('[SW] Background sync triggered');
    }
});

// ---- PUSH NOTIFICATIONS (future) ----
self.addEventListener('push', (event) => {
    // Placeholder for future push notifications
});
