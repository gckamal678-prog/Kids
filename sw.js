const CACHE_NAME = 'patshala-v6';

// १. क्यास गर्नुपर्ने फाइलहरूको सुची
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './dark-mode.js',
  './nepal.png',
  './192.png',
  './512.png',
  './anthem.mp3',
  './alphabet.html',
  './animals-birds.html',
  './barahakhari.html',
  './body-parts.html',
  './colors.html',
  './consonants.html',
  './days-months.html',
  './drawing.html',
  './fruits-vegetables.html',
  './image.html',
  './imageconsonants.html',
  './imegevowels.html',
  './numbers.html',
  './pahada.html',
  './quiz.html',
  './vehicles.html',
  './vowels.html'
];

// २. Install Event: सबै फाइलहरू डाउनलोड गरेर Cache मा राख्ने
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// ३. Activate Event: पुरानो क्यास (Old Versions) मात्र मेट्ने, नयाँ जोगाउने
self.addEventListener('activate', (event) => {
  event.waitUntil(
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

// ४. Fetch Event: अफलाइन हुँदा Cache बाट फाइल दिने
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // यदि Cache मा भेटियो भने त्यही दिने, नभए इन्टरनेटबाट ल्याउने
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    }).catch(() => {
      // इन्टरनेट र क्यास दुवै नहुँदा index.html खोल्ने
      return caches.match('./index.html');
    })
  );
});
