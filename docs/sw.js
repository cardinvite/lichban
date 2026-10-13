// Service worker: chạy được khi mất mạng. Đổi CACHE_VERSION mỗi lần cập nhật giao diện.
const CACHE_VERSION = 'lichban-v9';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/app.js',
  './js/config.js',
  './js/api.js',
  './js/store.js',
  './js/ui.js',
  './js/views/month.js',
  './js/views/dayDialog.js',
  './js/views/settings.js',
  './js/views/password.js',
  './js/shared/lunar.js',
  './js/shared/canchi.js',
  './js/shared/holidays.js',
  './js/shared/monthGrid.js',
  './js/shared/occurrence.js',
  './icons/icon-192.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Không bao giờ cache API Apps Script
  if (url.hostname.endsWith('script.google.com') || url.hostname.endsWith('googleusercontent.com')) return;

  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !isFont) return;

  // config.js (URL Apps Script): lấy từ mạng trước để đổi URL là có hiệu lực ngay
  if (url.origin === location.origin && url.pathname.endsWith('/js/config.js')) {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE_VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }

  // Trả bản trong cache ngay, đồng thời cập nhật cache từ mạng
  e.respondWith(caches.open(CACHE_VERSION).then(async (cache) => {
    const cached = await cache.match(req, { ignoreSearch: url.origin === location.origin });
    const network = fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    }).catch(() => cached);
    return cached || network;
  }));
});
