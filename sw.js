const CACHE_NAME = 'patshala-v5';

// Install Event
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate Event (पुराना सबै अड्किएका Cache हटाइदिने)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event (पहिला Internet/Server बाट खोल्ने, नभए मात्र Cache)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
