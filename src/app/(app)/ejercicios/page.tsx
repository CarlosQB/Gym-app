import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MergeExercises, type ExerciseOption } from "./MergeExercises";
import { ExerciseList } from "./ExerciseList";

export const metadata = { title: "Ejercicios" };

export default async function EjerciciosPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exercises")
    .select("*, sets(count)")
    .order("name");
  const exercises: ExerciseOption[] = (
    (data ?? []) as {
      id: string;
      name: string;
      muscle_group: string;
      image_id?: string | null;
      sets: { count: number }[];
    }[]
  ).map((e) => ({
    id: e.id,
    name: e.name,
    muscle: e.muscle_group,
    sets: e.sets?.[0]?.count ?? 0,
    image: e.image_id ?? null,
  }));

  return (
    <div className="flex flex-col gap-5">
      <header>
        <Link href="/rutinas" className="text-sm text-muted">
          ← Mis rutinas
        </Link>
        <h1 className="font-display text-[38px] font-bold leading-[1.05]">Ejercicios</h1>
        <p className="mt-1 text-sm text-muted">
          Si el mismo ejercicio quedó con dos nombres, únelos: se junta su historial y la recomendación vuelve a salir.
          Abajo eliges su imagen de técnica o le cambias el nombre.
        </p>
      </header>
      <MergeExercises exercises={exercises} />
      <ExerciseList exercises={exercises} />
    </div>
  );
}
