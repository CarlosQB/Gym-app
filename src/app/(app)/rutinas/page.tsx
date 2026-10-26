import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Routine } from "@/lib/types";

const WEEKDAYS = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default async function RutinasPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("routines")
    .select("*, routine_exercises(count)")
    .order("position");
  const routines = (data ?? []) as (Routine & { routine_exercises: { count: number }[] })[];

  return (
    <div className="flex flex-col gap-5">
      <header>
        <Link href="/entrenar" className="text-sm text-muted">
          ← Entrenar
        </Link>
        <h1 className="font-display text-[38px] font-bold leading-[1.05]">Mis rutinas</h1>
      </header>

      {routines.length > 0 && (
        <ul className="flex flex-col gap-3">
          {routines.map((r) => (
            <li key={r.id}>
              <Link
                href={`/rutinas/${r.id}`}
                className="flex items-center justify-between rounded-2xl bg-surface p-4"
              >
                <div>
                  <p className="font-display text-2xl font-bold leading-tight">{r.name}</p>
                  <p className="text-sm text-muted">
                    {r.weekday ? WEEKDAYS[r.weekday] : "Sin día fijo"} ·{" "}
                    {r.routine_exercises?.[0]?.count ?? 0} ejercicios
                  </p>
                </div>
                <span className="text-sm text-accent">Editar</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/rutinas/nueva"
        className="flex h-14 items-center justify-center rounded-2xl bg-accent text-lg font-semibold text-bg"
      >
        Nueva rutina
      </Link>
    </div>
  );
}
