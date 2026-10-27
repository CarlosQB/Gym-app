import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MergeExercises, type ExerciseOption } from "./MergeExercises";

export const metadata = { title: "Ejercicios" };

export default async function EjerciciosPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exercises")
    .select("id, name, muscle_group, sets(count)")
    .order("name");
  const exercises: ExerciseOption[] = (
    (data ?? []) as { id: string; name: string; muscle_group: string; sets: { count: number }[] }[]
  ).map((e) => ({ id: e.id, name: e.name, muscle: e.muscle_group, sets: e.sets?.[0]?.count ?? 0 }));

  return (
    <div className="flex flex-col gap-5">
      <header>
        <Link href="/rutinas" className="text-sm text-muted">
          ← Mis rutinas
        </Link>
        <h1 className="font-display text-[38px] font-bold leading-[1.05]">Ejercicios</h1>
        <p className="mt-1 text-sm text-muted">
          Si el mismo ejercicio quedó con dos nombres, únelos: se junta su historial y la recomendación vuelve a salir.
        </p>
      </header>
      <MergeExercises exercises={exercises} />
    </div>
  );
}
