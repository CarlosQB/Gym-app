"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "./Spinner";

/** Botón de formulario que se bloquea y muestra "cargando" mientras responde el servidor. */
export function SubmitButton({
  children,
  pendingText,
  className = "",
}: {
  children: React.ReactNode;
  pendingText: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`inline-flex items-center justify-center gap-2 disabled:opacity-70 ${className}`}
    >
      {pending ? (
        <>
          <Spinner />
          {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}
