const CACHE = 're-capture-v4';
// Relative to the SW scope: the PWA is served at '/' standalone but at
// '/app/' behind the field-loop sidecar — absolute paths would precache the
// wrong origin-root URLs (and 404 the install) under the mount.
const ASSETS = ['./', './index.html', './styles.css', './app.js', './db.js', './sync.js', './utils.js', './review.js', './manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      // One missing asset must not brick the whole install.
      Promise.allSettled(ASSETS.map((a) => c.add(a))),
    ),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // API calls are never served from cache — drafts must be live.
  if (new URL(e.request.url).pathname.includes('/api/')) return;
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request)),
  );
});
