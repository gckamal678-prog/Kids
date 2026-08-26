const CACHE_NAME = 'bal-pathshala-v7'; // नयाँ अपडेटको लागि यसलाई v8, v9 बनाउँदै जाने

// Install Event (सुरक्षित रूपमा इन्स्टल हुने)
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker Installed & Updated to ' + CACHE_NAME);
    })
  );
});

// Activate Event (पुरानो सबै क्यास स्वतः सफा गर्ने)
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Old cache deleted:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event (नयाँ फाइल देखिने बनाउने र अफलाइन सपोर्ट गर्ने)
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request).then((networkResponse) => {
      // नेटवर्कबाट लेटेस्ट फाइल तानेर क्यासमा अपडेट गर्ने
      return caches.open(CACHE_NAME).then((cache) => {
        cache.put(e.request, networkResponse.clone());
        return networkResponse;
      });
    }).catch(() => {
      // यदि इन्टरनेट छैन भने मात्र क्यास भएको पुरानो फाइल वा पेज देखाउने
      return caches.match(e.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // यदि अफलाइन छ र मुख्य पेज हो भने index.html देखाइदिने
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
