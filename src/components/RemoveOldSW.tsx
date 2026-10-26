"use client";

import { useEffect } from "react";

// Quita el service worker del modo offline (ya retirado) y sus cachés, si el teléfono aún lo tiene.
export function RemoveOldSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.getRegistrations().then(async (regs) => {
      if (regs.length === 0) return;
      await Promise.all(regs.map((r) => r.unregister()));
      if ("caches" in window) {
        for (const key of await caches.keys()) await caches.delete(key);
      }
    }).catch(() => {});
  }, []);
  return null;
}
