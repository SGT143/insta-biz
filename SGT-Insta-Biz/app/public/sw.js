// InstaBiz service worker.
// - Own files: network first, cache as fallback (so new deploys show up at once).
// - Firebase SDK & fonts: cache first (they are versioned and never change).
// - Firestore/Auth/Functions traffic is never touched; Firestore has its own offline cache.
const VERSION = 'v1';
const SHELL = `shell-${VERSION}`;
const LIBS = `libs-${VERSION}`;
const PRECACHE = [
  '/', '/site', '/onboard', '/manifest.webmanifest',
  '/css/app.css', '/js/fb.js', '/js/slug.js', '/js/site.js', '/js/onboard.js',
  '/icons/icon-192.png', '/icons/icon-512.png',
];
const LIB_HOSTS = ['www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keep = [SHELL, LIBS];
    for (const k of await caches.keys()) if (!keep.includes(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (LIB_HOSTS.includes(url.hostname)) {
    if (url.pathname.startsWith('/firebasejs/') || url.hostname.startsWith('fonts.')) {
      e.respondWith(cacheFirst(req));
    }
    return;
  }
  if (url.origin !== location.origin || url.pathname.startsWith('/__/')) return;

  e.respondWith(networkFirst(req));
});

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') (await caches.open(LIBS)).put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(SHELL);
  try {
    const res = await fetch(req);
    if (res.ok && !res.redirected) cache.put(req, res.clone());
    return res;
  } catch {
    const hit = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
    if (hit) return hit;
    if (req.mode === 'navigate') {
      // A business site we haven't cached yet: serve the site shell; Firestore's cache may still have data.
      const path = new URL(req.url).pathname;
      const fallback = path === '/' ? '/' : path.startsWith('/onboard') ? '/onboard' : '/site';
      return (await cache.match(fallback)) || Response.error();
    }
    return Response.error();
  }
}
