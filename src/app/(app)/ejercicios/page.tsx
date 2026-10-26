import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ExerciseRow } from "./ExerciseRow";
import type { Exercise } from "@/lib/types";

export default async function EjerciciosPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("exercises").select("*").order("name");
  const exercises = (data ?? []) as Exercise[];

  return (
    <div className="flex flex-col gap-5">
      <header>
        <Link href="/rutinas" className="text-sm text-muted">
          ← Mis rutinas
        </Link>
        <h1 className="font-display text-[38px] font-bold leading-[1.05]">Ejercicios</h1>
        <p className="text-sm text-muted">Corrige el grupo muscular y agrega el video de técnica.</p>
      </header>
      {exercises.length === 0 ? (
        <p className="text-muted">Aún no tienes ejercicios. Se crean desde el editor de rutinas.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {exercises.map((e) => (
            <ExerciseRow key={e.id} exercise={e} />
          ))}
        </ul>
      )}
    </div>
  );
}
