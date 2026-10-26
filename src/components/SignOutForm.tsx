"use client";

import { signOut } from "@/app/actions";
import { clearAllLocal } from "@/lib/offline";

/** Al cerrar sesión también se borra lo guardado en el teléfono. */
export function SignOutForm() {
  return (
    <form
      action={signOut}
      onSubmit={() => {
        clearAllLocal();
        navigator.serviceWorker?.controller?.postMessage("clear-caches");
      }}
      className="pt-2"
    >
      <button type="submit" className="text-sm text-muted underline">
        Cerrar sesión
      </button>
    </form>
  );
}
