const BUILD_VERSION = "__BUILD_VERSION__";
const CACHE_PREFIX = "urgencias-pediatricas-";
const CACHE_NAME = CACHE_PREFIX + BUILD_VERSION;
const APP_ROOT = self.registration.scope;

const CORE_URLS = [
  new URL("./", APP_ROOT).href,
  new URL("manifest.webmanifest", APP_ROOT).href,
  new URL("offline-urls.json", APP_ROOT).href,
  new URL("assets/icons/icon-192.png", APP_ROOT).href,
  new URL("assets/icons/icon-512.png", APP_ROOT).href,
  new URL("assets/icons/apple-touch-icon.png", APP_ROOT).href,
  new URL("data/drugs.json", APP_ROOT).href,
  new URL("javascripts/dose-calculator.js", APP_ROOT).href,
];

async function cacheUrl(cache, url) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (response && response.ok) {
      await cache.put(url, response.clone());
    }
  } catch (_) {
    // El modo offline puede activarse durante una actualización.
  }
}

async function precacheProtocols(cache) {
  try {
    const listUrl = new URL("offline-urls.json", APP_ROOT).href;
    const response = await fetch(listUrl, { cache: "no-store" });
    if (!response.ok) return;

    const relativeUrls = await response.json();
    const urls = relativeUrls
      .map((value) => {
        try {
          return new URL(value, APP_ROOT);
        } catch (_) {
          return null;
        }
      })
      .filter(
        (url) =>
          url &&
          url.origin === self.location.origin &&
          url.href.startsWith(APP_ROOT)
      )
      .map((url) => url.href);

    const batchSize = 8;
    for (let i = 0; i < urls.length; i += batchSize) {
      await Promise.allSettled(
        urls.slice(i, i + batchSize).map((url) => cacheUrl(cache, url))
      );
    }
  } catch (_) {
    // Si falla la precarga, la app seguirá usando caché bajo demanda.
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.allSettled(CORE_URLS.map((url) => cacheUrl(cache, url)));
      await precacheProtocols(cache);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_URLS" || !Array.isArray(event.data.urls)) {
    return;
  }

  const urls = event.data.urls
    .map((value) => {
      try {
        return new URL(value, APP_ROOT);
      } catch (_) {
        return null;
      }
    })
    .filter(
      (url) =>
        url &&
        url.origin === self.location.origin &&
        url.href.startsWith(APP_ROOT)
    )
    .map((url) => url.href);

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.allSettled(
        [...new Set(urls)].map((url) => cacheUrl(cache, url))
      );
    })()
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response && response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    const cached = await cache.match(request);
    if (cached) return cached;

    if (request.mode === "navigate") {
      const home = await cache.match(new URL("./", APP_ROOT).href);
      if (home) return home;

      return new Response(
        "<!doctype html><html lang=\"es\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Sin conexión</title><body><main><h1>Sin conexión</h1><p>Este protocolo todavía no está disponible sin conexión. Conéctate una vez para guardarlo en el dispositivo.</p></main></body></html>",
        {
          status: 503,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }

    return Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then(async (response) => {
      if (response && response.ok) {
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || (await network) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (
    url.origin !== self.location.origin ||
    !url.href.startsWith(APP_ROOT)
  ) {
    return;
  }

  const isStaticAsset = ["style", "script", "image", "font"].includes(
    request.destination
  );

  if (request.mode === "navigate" || !isStaticAsset) {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});
