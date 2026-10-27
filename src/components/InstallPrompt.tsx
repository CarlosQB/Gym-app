"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const KEY = "gym:install-dismissed";

/** Invita a instalar la app en la pantalla de inicio (Android: botón; iPhone: pasos de Safari). */
export function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(KEY) === "1";
    } catch {}
    if (standalone || dismissed) return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIos(isIos);
    setHidden(!isIos);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (hidden) return null;

  function dismiss() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setHidden(true);
  }

  async function install() {
    if (!event) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === "accepted") setHidden(true);
    setEvent(null);
  }

  return (
    <section aria-label="Instalar la app" className="flex flex-col gap-2 rounded-[20px] bg-accent-dim p-4">
      <p className="font-semibold text-accent">Instálala como app</p>
      {ios ? (
        <p className="text-sm text-text">
          En Safari toca <strong>Compartir</strong> (el cuadro con flecha) y luego{" "}
          <strong>Agregar a inicio</strong>. Se abre a pantalla completa, sin barra del navegador.
        </p>
      ) : (
        <p className="text-sm text-text">Queda con su ícono en tu pantalla de inicio y se abre a pantalla completa.</p>
      )}
      <div className="flex gap-2">
        {!ios && event && (
          <button type="button" onClick={install} className="h-11 flex-1 rounded-xl bg-accent font-semibold text-bg">
            Instalar
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="h-11 rounded-xl bg-surface-2 px-4 text-sm font-semibold text-muted"
        >
          Ahora no
        </button>
      </div>
    </section>
  );
}
