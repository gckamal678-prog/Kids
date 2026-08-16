const CACHE_NAME = 'bal-pathshala-v5';

// क्यास गर्नुपर्ने फाइलहरू (एउटा पनि स्पेलिङ गलत हुनुहुँदैन)
const assets = [
  '/',
  '/index.html',
  '/alphabet.html',
  '/animals-birds.html',
  '/anthem.mp3',
  '/barahakhari.html',
  '/body-parts.html',
  '/colors.html',
  '/consonants.html',
  '/dark-mode.js',
  '/days-months.html',
  '/drawing.html',
  '/fruits-vegetables.html',
  '/image.html',
  '/imageconsonants.html',
  '/imagevowels.html',
  '/nepal.png',
  '/numbers.html',
  '/pahada.html',
  '/quiz.html',
  '/vehicles.html',
  '/vowels.html',
  '/192.png',
  '/512.png'
];

// Install Event
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(assets);
    })
  );
});

// Activate Event
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event (Offline Support Fix)
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((response) => {
      if (response) {
        return response;
      }
      return fetch(e.request).catch(() => {
        return caches.match('/index.html');
      });
    })
  );
});
