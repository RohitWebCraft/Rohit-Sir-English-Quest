/* Rohit Sir English Quest - offline service worker
   Network-first: pehle internet se NAYA lo (max 3 second wait), nahi mile to device me saved copy chalao.
   Isse update bhi jaldi pahunchta hai aur bina internet ke game bhi khulta hai. */
const CACHE = 'rsq-offline-v1';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'favicon-32.png', 'apple-touch-icon.png'];
const WAIT_MS = 3000;

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(CORE.map(function (u) { return c.add(u).catch(function () {}); }));
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
       /* Google Sheet / Apps Script ko haath nahi lagate */
  if (/\.(mp4|webm)$/i.test(url.pathname)) return;           /* video seedha browser chalaye (range requests) */
  e.respondWith(networkFirst(e, req));
});

function networkFirst(e, req) {
  const net = fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(function (res) {
    if (res && res.ok) {
      const copy = res.clone();
      e.waitUntil(caches.open(CACHE).then(function (c) { return c.put(req.url, copy); }).catch(function () {}));
    }
    return res;
  });
  net.catch(function () {});
  const timer = new Promise(function (_, rej) { setTimeout(function () { rej(new Error('slow')); }, WAIT_MS); });
  return Promise.race([net, timer]).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      if (req.mode === 'navigate') {
        return caches.match('index.html').then(function (idx) { return idx || net; });
      }
      return net;
    });
  });
}
