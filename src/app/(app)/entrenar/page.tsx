import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { startWorkout } from "@/app/actions";
import type { Routine } from "@/lib/types";

const WEEKDAYS = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default async function EntrenarPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("routines").select("*").order("position");
  const routines = (data ?? []) as Routine[];

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-[38px] font-bold leading-[1.05]">Entrenar</h1>

      {routines.length === 0 ? (
        <p className="text-muted">
          No tienes rutinas todavía. Crea la tuya abajo.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {routines.map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded-2xl bg-surface p-4">
              <div>
                <p className="font-display text-2xl font-bold leading-tight">{r.name}</p>
                <p className="text-sm text-muted">
                  {r.weekday ? WEEKDAYS[r.weekday] : "Sin día fijo"}
                </p>
              </div>
              <form action={startWorkout.bind(null, r.id)}>
                <button
                  type="submit"
                  className="h-12 rounded-xl bg-accent px-5 font-semibold text-bg"
                >
                  Iniciar
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-3">
        <Link
          href="/rutinas"
          className="flex h-12 flex-1 items-center justify-center rounded-xl bg-surface-2 font-semibold"
        >
          Mis rutinas
        </Link>
        <Link
          href="/historial"
          className="flex h-12 flex-1 items-center justify-center rounded-xl bg-surface-2 font-semibold"
        >
          Historial
        </Link>
      </div>
    </div>
  );
}
