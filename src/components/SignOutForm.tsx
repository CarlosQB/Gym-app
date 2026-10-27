"use client";

import { signOut } from "@/app/actions";
import { clearAllLocal, getQueue } from "@/lib/offline";

/** Al cerrar sesión también se borra lo guardado en el teléfono. */
export function SignOutForm() {
  return (
    <form
      action={signOut}
      onSubmit={(e) => {
        const pending = getQueue().length;
        if (
          pending > 0 &&
          !window.confirm(`Hay ${pending} ${pending === 1 ? "cambio" : "cambios"} sin enviar y se perderán. ¿Cerrar sesión?`)
        ) {
          e.preventDefault();
          return;
        }
        clearAllLocal();
      }}
      className="pt-2"
    >
      <button type="submit" className="text-sm text-muted underline">
        Cerrar sesión
      </button>
    </form>
  );
}
