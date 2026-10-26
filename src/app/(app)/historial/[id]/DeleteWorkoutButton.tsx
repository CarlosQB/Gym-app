"use client";

import { useTransition } from "react";
import { deleteWorkout } from "@/app/actions";

export function DeleteWorkoutButton({ workoutId }: { workoutId: string }) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("¿Borrar esta sesión completa con todas sus series? No se puede deshacer.")) return;
        start(async () => {
          await deleteWorkout(workoutId);
        });
      }}
      className="h-12 w-full rounded-2xl border border-warn text-[15px] font-semibold text-warn disabled:opacity-50"
    >
      {pending ? "Borrando…" : "Borrar sesión"}
    </button>
  );
}
