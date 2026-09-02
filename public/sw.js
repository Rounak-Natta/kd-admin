const CACHE_VERSION = "kd-app-shell-v3";
const CORE_CACHE = `${CACHE_VERSION}-core`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const CORE_ASSETS = [
  "/",
  "/login",
  "/offline",
  "/manifest.json",
  "/kd-icon-192.png",
  "/kd-icon-512.png",
];

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

function isExcludedRequest(request, url) {
  if (request.method !== "GET") {
    return true;
  }

  if (!isSameOrigin(url)) {
    return true;
  }

  if (isApiRequest(url)) {
    return true;
  }

  return false;
}

async function putRuntime(request, response) {
  if (!response || !response.ok) {
    return response;
  }

  const cache = await caches.open(RUNTIME_CACHE);
  await cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    void putRuntime(request, response);
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    /*
     * A previously visited dashboard/POS page is cached during
     * normal operation. If a navigation has never been visited,
     * fall back to the cached login/app shell rather than
     * pretending that the user was logged out.
     */
    const fallback =
      (await caches.match("/offline")) ||
      (await caches.match("/"));

    return (
      fallback ||
      new Response(
        "<!doctype html><title>Kitchen Diaries Offline</title><p>Reconnect to continue.</p>",
        {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
          },
        },
      )
    );
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    void putRuntime(request, response);
    return response;
  } catch {
    return Response.error();
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CORE_CACHE)
      .then((cache) =>
        cache.addAll(CORE_ASSETS),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key !== CORE_CACHE &&
                key !== RUNTIME_CACHE,
            )
            .map((key) =>
              caches.delete(key),
            ),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    isExcludedRequest(
      request,
      url,
    )
  ) {
    return;
  }

  /*
   * Navigation requests use network-first so the user sees
   * fresh server HTML while online and the last known route
   * while offline.
   */
  if (
    request.mode === "navigate" ||
    request.destination === "document"
  ) {
    event.respondWith(
      networkFirst(request),
    );
    return;
  }

  /*
   * Next.js JS/CSS/image/font assets are safe to cache. This
   * is essential for an offline reload because the browser
   * cannot hydrate a cached HTML document without its chunks.
   */
  event.respondWith(
    cacheFirst(request),
  );
});

self.addEventListener("message", (event) => {
  if (
    event.data?.type ===
    "SKIP_WAITING"
  ) {
    self.skipWaiting();
  }
});
