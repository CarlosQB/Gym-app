"use client";

import { useState, useTransition } from "react";
import { deleteWorkout } from "@/app/actions";

export function DeleteWorkoutButton({ workoutId }: { workoutId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("¿Borrar esta sesión completa con todas sus series? No se puede deshacer.")) return;
        setError(null);
        start(async () => {
          try {
            const res = await deleteWorkout(workoutId); // si sale bien, redirige al historial
            if (res && !res.ok) setError(res.error);
          } catch {
            setError("No se pudo borrar. Revisa tu conexión e inténtalo de nuevo.");
          }
        });
      }}
      className="h-12 w-full rounded-2xl border border-warn text-[15px] font-semibold text-warn disabled:opacity-50"
    >
      {pending ? "Borrando…" : "Borrar sesión"}
    </button>
    {error && (
      <p role="alert" className="text-sm text-warn">
        {error}
      </p>
    )}
    </div>
  );
}
