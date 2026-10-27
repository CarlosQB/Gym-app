import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SessionView } from "./SessionView";
import { getUnit } from "@/lib/unit.server";
import type { LastBest, RoutineExercise, SetRow, Workout } from "@/lib/types";

export default async function SesionPage(props: PageProps<"/entrenar/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const unit = await getUnit();

  const { data: workout } = await supabase
    .from("workouts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!workout) notFound();

  const w = workout as Workout;

  const [itemsRes, setsRes] = await Promise.all([
    w.routine_id
      ? supabase
          .from("routine_exercises")
          .select("*, exercise:exercises!exercise_id(*), alt_exercise:exercises!alt_exercise_id(*)")
          .eq("routine_id", w.routine_id)
          .order("position")
      : Promise.resolve({ data: [] }),
    supabase.from("sets").select("*").eq("workout_id", id).order("created_at"),
  ]);

  const items = (itemsRes.data ?? []) as RoutineExercise[];
  const sets = (setsRes.data ?? []) as SetRow[];

  // Mejor serie de la sesión anterior de cada ejercicio (para superarla).
  const lastBest: Record<string, LastBest> = {};
  const exerciseIds = items.flatMap((i) =>
    i.alt_exercise_id ? [i.exercise_id, i.alt_exercise_id] : [i.exercise_id],
  );
  if (exerciseIds.length > 0) {
    const { data: prev } = await supabase
      .from("sets")
      .select("exercise_id, workout_id, weight_kg, reps, rir, created_at")
      .in("exercise_id", exerciseIds)
      .eq("kind", "normal")
      .neq("workout_id", id)
      .order("created_at", { ascending: false })
      .limit(400);

    const latestWorkout: Record<string, string> = {};
    for (const s of prev ?? []) {
      if (!latestWorkout[s.exercise_id]) latestWorkout[s.exercise_id] = s.workout_id;
    }
    for (const s of prev ?? []) {
      if (s.workout_id !== latestWorkout[s.exercise_id]) continue;
      const cur = lastBest[s.exercise_id];
      const weight = Number(s.weight_kg);
      if (!cur || weight > cur.weight_kg || (weight === cur.weight_kg && s.reps > cur.reps)) {
        lastBest[s.exercise_id] = { weight_kg: weight, reps: s.reps, rir: s.rir };
      }
    }
  }

  return (
    <SessionView
      workout={w}
      items={items}
      sets={sets.map((s) => ({ ...s, weight_kg: Number(s.weight_kg) }))}
      lastBest={lastBest}
      unit={unit}
    />
  );
}
