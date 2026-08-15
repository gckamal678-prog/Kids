const CACHE_NAME = 'patshala-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './nepal.png',
  './192.png',
  ./512.png'
];

// Service Worker Install
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetching Assets (Offline Work)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});
