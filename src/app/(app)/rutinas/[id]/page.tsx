import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RoutineEditor } from "../RoutineEditor";
import type { Exercise, Routine, RoutineExercise } from "@/lib/types";

export default async function EditarRutinaPage(props: PageProps<"/rutinas/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();

  const [routineRes, itemsRes, catalogRes] = await Promise.all([
    supabase.from("routines").select("*").eq("id", id).maybeSingle(),
    supabase.from("routine_exercises").select("*").eq("routine_id", id).order("position"),
    supabase.from("exercises").select("*").order("name"),
  ]);
  if (!routineRes.data) notFound();

  const routine = routineRes.data as Routine;
  const items = (itemsRes.data ?? []) as RoutineExercise[];

  return (
    <RoutineEditor
      catalog={(catalogRes.data ?? []) as Exercise[]}
      initial={{
        id: routine.id,
        name: routine.name,
        weekday: routine.weekday,
        items: items.map((it) => ({
          exerciseId: it.exercise_id,
          newName: "",
          muscleGroup: "",
          targetSets: it.target_sets,
          repMin: it.rep_min,
          repMax: it.rep_max,
          rirMin: it.rir_min,
          rirMax: it.rir_max,
          restSeconds: it.rest_seconds,
          withPrevious: it.with_previous,
          altExerciseId: it.alt_exercise_id,
          altNewName: "",
          altMuscleGroup: "",
        })),
      }}
    />
  );
}
