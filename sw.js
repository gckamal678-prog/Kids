const CACHE_NAME = 'bal-pathshala-v6';

// Install Event (अहिले सबै फाइल एकैचोटि तानेर ब्लक गर्दैन, सुरक्षित रूपमा इन्स्टल हुन्छ)
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker Installed');
    })
  );
});

// Activate Event (पुरानो क्यास स्वतः सफा गर्ने)
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

// Fetch Event (जुन पेज वा फाइल खोल्छ, त्यसलाई अटोमेटिक क्यास गर्दै जाने)
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      // यदि क्यासमा छ भने त्यही देखाउने, नभए इन्टरनेटबाट तानेर ल्याउने र क्याسमा सेभ गर्ने
      return cachedResponse || fetch(e.request).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, networkResponse.clone());
          return networkResponse;
        });
      }).catch(() => {
        // यदि अफलाइन छ र मुख्य पेज हो भने index.html देखाइदिने
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
