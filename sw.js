// Service Worker for MaterialYouNewTab
const CACHE_NAME = 'mynt-static-v1';
const RUNTIME_CACHE = 'mynt-runtime-v1';
const OFFLINE_URLS = [
  '/', '/index.html', '/style.css', '/manifest.json', '/scripts/script.js',
  '/scripts/defaults.js', '/scripts/wallpaper.js', '/scripts/weather.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS)).catch(()=>{})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Clean up old caches if any (basic)
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME && k !== RUNTIME_CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (request.method === 'GET' && response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request) || await caches.match(request);
    if (cached) return cached;
    return caches.match('/index.html');
  }
}

async function cacheFirst(request, event) {
  const cached = await caches.match(request);
  if (cached) {
    // background update
    event.waitUntil(fetch(request).then(resp => {
      if (resp && resp.status === 200) caches.open(RUNTIME_CACHE).then(c=>c.put(request, resp.clone()));
    }).catch(()=>{}));
    return cached;
  }
  try {
    const resp = await fetch(request);
    if (resp && resp.status === 200) {
      const c = await caches.open(RUNTIME_CACHE);
      c.put(request, resp.clone());
    }
    return resp;
  } catch (e) {
    return caches.match('/index.html');
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Network-first for defaults.json and common API endpoints
  if (url.pathname.endsWith('/defaults.json') || url.hostname.includes('weatherapi') || url.pathname.includes('/api/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Cache-first for static assets and images
  if (event.request.destination === 'image' || url.pathname.endsWith('.css') || url.pathname.endsWith('.js') || url.pathname.endsWith('.json')) {
    event.respondWith(cacheFirst(event.request, event));
    return;
  }

  // Default network-first
  event.respondWith(networkFirst(event.request));
});
