"use client";

import { useEffect } from "react";

// Si una pantalla falla, se muestra el motivo y una forma de recuperarse sin quedar bloqueado.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  async function hardReset() {
    try {
      const regs = (await navigator.serviceWorker?.getRegistrations()) ?? [];
      await Promise.all(regs.map((r) => r.unregister()));
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch {
      // nada
    }
    window.location.reload();
  }

  return (
    <div className="flex flex-col gap-4 pt-6">
      <h1 className="font-display text-[34px] font-bold leading-[1.1]">Algo salió mal</h1>
      <p className="text-sm text-muted">
        {error.message || "Error inesperado."}
        {error.digest ? ` (ref. ${error.digest})` : ""}
      </p>
      <button type="button" onClick={reset} className="h-12 rounded-2xl bg-accent font-semibold text-bg">
        Reintentar
      </button>
      <button type="button" onClick={hardReset} className="h-12 rounded-2xl bg-surface-2 font-semibold">
        Limpiar caché y recargar
      </button>
    </div>
  );
}
