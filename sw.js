// Voice Trainer — offline service worker.
// Bump CACHE_NAME whenever any cached file changes; the activate handler
// drops old caches and `clients.claim()` makes the update take effect
// without requiring a second reload.
const CACHE_NAME = 'voice-trainer-v11';
const ASSETS = [
  './',
  './index.html',
  './generator.html',
  './wizard.html',
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first for HTML documents — always serve fresh content when online.
// Stale-while-revalidate for everything else (icons, manifest, etc.)
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then(resp => {
          if (resp && resp.ok)
            caches.open(CACHE_NAME).then(cache => cache.put(req, resp.clone()));
          return resp;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(resp => {
        if (resp && resp.ok)
          caches.open(CACHE_NAME).then(cache => cache.put(req, resp.clone()));
        return resp;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
