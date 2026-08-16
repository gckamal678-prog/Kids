const CACHE_NAME = 'bal-pathshala-v2';

// क्यास गर्नुपर्ने फाइलहरूको सूची
const assets = [
  './',
  './index.html',
  './alphabet.html',
  './animals-birds.html',
  './anthem.mp3',
  './barahakhari.html',
  './body-parts.html',
  './colors.html',
  './consonants.html',
  './dark-mode.js',
  './days-months.html',
  './drawing.html',
  './fruits-vegetables.html',
  './image.html',
  './imageconsonants.html',
  './imegevowels.html',
  './manifest.json',
  './nepal.png',
  './numbers.html',
  './pahada.html',
  './quiz.html',
  './vehicles.html',
  './vowels.html',
  './192.png',
  './512.png'
];

// Install Event: फाइलहरू क्यास गर्ने
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(assets);
    })
  );
  self.skipWaiting();
});

// Activate Event: पुरानो क्यास हटाउने
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
    })
  );
  return self.clients.claim();
});

// Fetch Event: नेटवर्क वा क्यासबाट फाइल लोड गर्ने
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request).catch(() => {
        return caches.match('./index.html');
      });
    })
  );
});
