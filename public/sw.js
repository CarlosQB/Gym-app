// Service worker de retiro: el modo offline se quitó y este archivo reemplaza al anterior.
// Cuando el teléfono busca actualización, se instala, borra los cachés viejos y se da de baja.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) await caches.delete(key);
      await self.registration.unregister();
      for (const client of await self.clients.matchAll({ type: "window" })) {
        client.navigate(client.url);
      }
    })(),
  );
});
