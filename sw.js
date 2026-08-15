const CACHE_NAME = 'patshala-cache-v3';
const urlsToCache = [
  './',
  './index.html',
  './pahada.html',
  './alphabet.html',
  './image.html',
  './vowels.html',
  './imegevowels.html',
  './consonants.html',
  './imageconsonants.html',
  './barahakhari.html',
  './colors.html',
  './fruits-vegetables.html',
  './animals-birds.html',
  './body-parts.html',
  './vehicles.html',
  './days-months.html',
  './numbers.html',
  './nepal.png',
  './192.png',
  './512.png',
  './manifest.json'
];

// Service Worker Install
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate & Clear Old Cache
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Fetch Offline Support
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});
