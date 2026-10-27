"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearFailed, getFailed, getQueue, needsLogin, snapshotStorage, subscribeStorage } from "@/lib/offline";
import { flushQueue } from "@/lib/sync";

const subscribeOnline = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

/** Envía la cola local cuando hay señal y avisa del estado de la conexión. */
export function OfflineSync() {
  const router = useRouter();
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
  const snapshot = useSyncExternalStore(subscribeStorage, snapshotStorage, () => "");
  const pending = snapshot ? getQueue().length : 0;
  const failed = snapshot ? getFailed().length : 0;
  const login = snapshot ? needsLogin() : false;

  useEffect(() => {
    async function sync() {
      const sent = await flushQueue();
      if (sent > 0) router.refresh();
    }
    void sync();
    const t = setInterval(() => {
      if (getQueue().length > 0) void sync();
    }, 15000);
    window.addEventListener("online", sync);
    return () => {
      clearInterval(t);
      window.removeEventListener("online", sync);
    };
  }, [router]);

  // Sin señal, recargar deja la pantalla en blanco: se avisa antes si hay cambios sin enviar.
  useEffect(() => {
    function warn(e: BeforeUnloadEvent) {
      if (!navigator.onLine && getQueue().length > 0) e.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  if (online && pending === 0 && failed === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-20 flex justify-center px-4">
      <div
        role="status"
        className="pointer-events-auto max-w-[400px] rounded-full bg-surface-2 px-4 py-2 text-center text-[13px] font-semibold ring-1 ring-line"
      >
        {failed > 0 ? (
          <>
            {failed} {failed === 1 ? "cambio no se pudo" : "cambios no se pudieron"} guardar{" "}
            <button type="button" onClick={clearFailed} className="ml-1 text-accent underline">
              Entendido
            </button>
          </>
        ) : login && pending > 0 ? (
          <>
            Inicia sesión para enviar {pending} {pending === 1 ? "cambio" : "cambios"}{" "}
            <Link href="/login" className="ml-1 text-accent underline">
              Entrar
            </Link>
          </>
        ) : !online ? (
          <>Sin señal · se guarda en tu teléfono{pending > 0 ? ` (${pending} sin enviar)` : ""}</>
        ) : (
          <>Enviando {pending} {pending === 1 ? "cambio" : "cambios"}…</>
        )}
      </div>
    </div>
  );
}
