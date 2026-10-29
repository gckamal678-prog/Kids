
"use strict";

const CACHE_VERSION = "bal-pathshala-v8";
const APP_SCOPE = new URL(self.registration.scope);
const HOME_URL = new URL("index.html", APP_SCOPE).href;
const MANIFEST_URL = new URL("manifest.json", APP_SCOPE).href;

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);

    // Install the home page first so offline navigation has a fallback.
    try {
      const response = await fetch(HOME_URL, {
        cache: "reload"
      });

      if (response.ok && response.type === "basic") {
        await cache.put(HOME_URL, response);
      }
    } catch (error) {
      // Installation can still proceed; fallback may be unavailable
      // until the home page has been loaded successfully online.
      console.warn("Could not pre-cache home page:", error);
    }

    // Cache the manifest when it is available.
    try {
      const response = await fetch(MANIFEST_URL, {
        cache: "reload"
      });

      if (response.ok && response.type === "basic") {
        await cache.put(MANIFEST_URL, response);
      }
    } catch (_) {
      // The manifest can be cached on a later successful request.
    }

    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();

    await Promise.all(
      keys
        .filter(key =>
          key.startsWith("bal-pathshala-") &&
          key !== CACHE_VERSION
        )
        .map(key => caches.delete(key))
    );

    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const requestUrl = new URL(request.url);

  // Never cache external services or cross-origin requests.
  if (requestUrl.origin !== self.location.origin) return;

  // Keep requests outside this service worker's deployment scope untouched.
  if (!requestUrl.href.startsWith(APP_SCOPE.href)) return;

  // Do not cache partial media requests.
  if (request.headers.has("range")) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);

    try {
      // Network-first: prefer the latest available version.
      const networkResponse = await fetch(request);

      // Never replace a good cached page with an error response.
      if (
        networkResponse.ok &&
        networkResponse.type === "basic"
      ) {
        await cache.put(request, networkResponse.clone());
      }

      return networkResponse;
    } catch (_) {
      // Offline: first look for the exact requested resource.
      const cached = await cache.match(request);

      if (cached) return cached;

      // Only navigations receive the home-page fallback.
      if (request.mode === "navigate") {
        const home = await cache.match(HOME_URL);

        if (home) return home;
      }

      // Do not return index.html for missing images, scripts or CSS.
      return new Response(
        "अफलाइन हुँदा यो सामग्री उपलब्ध छैन। इन्टरनेट जोडेर फेरि प्रयास गर्नुहोस्।",
        {
          status: 503,
          statusText: "Offline",
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store"
          }
        }
      );
    }
  })());
});
