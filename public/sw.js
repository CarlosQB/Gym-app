// Service worker: deja abrir la app y la sesión de entrenamiento sin señal.
// - /_next/static (JS, CSS, fuentes) e iconos: se guardan y se sirven del caché.
// - Páginas: red primero (con límite de espera) y, si falla, la última copia guardada.
// Los datos nuevos se guardan en el teléfono y se sincronizan al volver la conexión (ver src/lib/offline.ts).
const VERSION = "v1";
const PAGES = `gym-pages-${VERSION}`;
const STATIC = `gym-static-${VERSION}`;
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key !== PAGES && key !== STATIC) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "clear-caches") {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))),
    );
  }
});

function isStatic(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function networkFirst(request) {
  const cache = await caches.open(PAGES);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
  try {
    const res = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    const path = new URL(request.url).pathname;
    // No se guardan redirecciones (p. ej. a /login) ni respuestas con error.
    if (res.ok && !res.redirected && !path.startsWith("/login")) {
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    clearTimeout(timer);
    const hit = await cache.match(request);
    if (hit) return hit;
    return new Response(
      "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><body style='background:#0d0e10;color:#f2f3f5;font-family:sans-serif;padding:24px'><h1>Sin conexión</h1><p>Esta pantalla aún no está guardada en el teléfono. Ábrela una vez con señal.</p>",
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isStatic(url)) {
    event.respondWith(cacheFirst(request));
  } else if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
  }
});
