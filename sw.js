/* Bushido Leather service worker — caches the app shell for instant loads */
const CACHE = 'bushido-v1';
const SHELL = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  /* Never cache Supabase API calls — products, orders, and login must always be live */
  if (url.hostname.endsWith('supabase.co')) return;
  if (e.request.method !== 'GET') return;

  /* Network-first for the page itself (so updates arrive), cache fallback for offline */
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put('/', copy)); return r; })
        .catch(() => caches.match('/'))
    );
    return;
  }

  /* Cache-first for static assets (icons, fonts, product images) */
  e.respondWith(
    caches.match(e.request).then(hit => hit ||
      fetch(e.request).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return r;
      }).catch(() => hit)
    )
  );
});
