const BUILD_VERSION = "__BUILD_VERSION__";
const CACHE_PREFIX = "urgencias-pediatricas-";
const CACHE_NAME = CACHE_PREFIX + BUILD_VERSION;
const APP_ROOT = self.registration.scope;

const CORE_URLS = [
  new URL("./", APP_ROOT).href,
  new URL("manifest.webmanifest", APP_ROOT).href,
  new URL("build-info.json", APP_ROOT).href,
  new URL("offline-urls.json", APP_ROOT).href,
  new URL("offline-static-urls.json", APP_ROOT).href,
  new URL("search/search_index.json", APP_ROOT).href,
  new URL("assets/icons/icon-192.png", APP_ROOT).href,
  new URL("assets/icons/icon-512.png", APP_ROOT).href,
  new URL("assets/icons/apple-touch-icon.png", APP_ROOT).href,
  new URL("data/drugs.json", APP_ROOT).href,
  new URL("data/infusions.json", APP_ROOT).href,
  new URL("data/rsi.json", APP_ROOT).href,
  new URL("javascripts/dose-calculator.js", APP_ROOT).href,
  new URL("javascripts/infusion-calculator.js", APP_ROOT).href,
  new URL("javascripts/pwa.js", APP_ROOT).href,
];

async function cacheUrl(cache, url) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (response && response.ok) {
      await cache.put(url, response.clone());
      return true;
    }
  } catch (_) {
    // La precarga puede ejecutarse durante una conectividad inestable.
  }
  return false;
}

async function readCachedJson(cache, url) {
  const response = await cache.match(url);
  if (!response) return null;
  try {
    return await response.clone().json();
  } catch (_) {
    return null;
  }
}

async function precacheUrlList(cache, listPath) {
  const listUrl = new URL(listPath, APP_ROOT).href;

  try {
    const response = await fetch(listUrl, { cache: "no-store" });
    if (!response.ok) return { total: 0, cached: 0 };

    await cache.put(listUrl, response.clone());
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

    let cached = 0;
    const batchSize = 8;
    for (let i = 0; i < urls.length; i += batchSize) {
      const results = await Promise.all(
        urls.slice(i, i + batchSize).map((url) => cacheUrl(cache, url))
      );
      cached += results.filter(Boolean).length;
    }

    return { total: urls.length, cached };
  } catch (_) {
    return { total: 0, cached: 0 };
  }
}

async function listCacheStatus(cache, listPath) {
  const listUrl = new URL(listPath, APP_ROOT).href;
  const relativeUrls = await readCachedJson(cache, listUrl);
  if (!Array.isArray(relativeUrls)) {
    return { total: 0, cached: 0, complete: false };
  }

  const urls = relativeUrls
    .map((value) => {
      try {
        return new URL(value, APP_ROOT).href;
      } catch (_) {
        return null;
      }
    })
    .filter(Boolean);

  let cached = 0;
  const checks = await Promise.all(urls.map((url) => cache.match(url)));
  cached = checks.filter(Boolean).length;

  return {
    total: urls.length,
    cached,
    complete: urls.length > 0 && cached === urls.length,
  };
}

async function pwaStatus() {
  const cache = await caches.open(CACHE_NAME);
  const [protocols, staticAssets] = await Promise.all([
    listCacheStatus(cache, "offline-urls.json"),
    listCacheStatus(cache, "offline-static-urls.json"),
  ]);

  const coreMatches = await Promise.all(
    CORE_URLS.map((url) => cache.match(url))
  );
  const coreCached = coreMatches.filter(Boolean).length;
  const coreComplete = coreCached === CORE_URLS.length;
  const buildInfo =
    (await readCachedJson(
      cache,
      new URL("build-info.json", APP_ROOT).href
    )) || { version: BUILD_VERSION, short_version: BUILD_VERSION.slice(0, 8) };

  return {
    version: BUILD_VERSION,
    buildInfo,
    protocols,
    staticAssets,
    core: {
      total: CORE_URLS.length,
      cached: coreCached,
      complete: coreComplete,
    },
    offlineReady:
      coreComplete && protocols.complete && staticAssets.complete,
  };
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.allSettled(CORE_URLS.map((url) => cacheUrl(cache, url)));
      await Promise.all([
        precacheUrlList(cache, "offline-urls.json"),
        precacheUrlList(cache, "offline-static-urls.json"),
      ]);
      // No activar automáticamente sobre una versión existente.
      // La interfaz ofrece "Actualizar ahora" para hacer el cambio de forma visible.
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
  const type = event.data?.type;

  if (type === "SKIP_WAITING") {
    event.waitUntil(self.skipWaiting());
    return;
  }

  if (type === "GET_STATUS") {
    const requestId = event.data?.requestId;
    event.waitUntil(
      (async () => {
        const status = await pwaStatus();
        event.source?.postMessage({
          type: "PWA_STATUS",
          requestId,
          ...status,
        });
      })()
    );
    return;
  }

  if (type !== "CACHE_URLS" || !Array.isArray(event.data.urls)) {
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
  const updateCritical =
    url.pathname.endsWith("/javascripts/pwa.js") ||
    url.pathname.endsWith("/build-info.json") ||
    url.pathname.endsWith("/service-worker.js");

  if (request.mode === "navigate" || !isStaticAsset || updateCritical) {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});
