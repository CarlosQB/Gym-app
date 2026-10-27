import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SessionView } from "./SessionView";
import { getUnit } from "@/lib/unit.server";
import type { LastBest, LastSetRow, RoutineExercise, SetRow, Workout } from "@/lib/types";

export default async function SesionPage(props: PageProps<"/entrenar/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const unit = await getUnit();

  // Una sola ronda: la sesión con los ejercicios de su rutina, sus series y el catálogo, en paralelo.
  const [workoutRes, setsRes, exRes] = await Promise.all([
    supabase
      .from("workouts")
      .select(
        "*, routine:routines(routine_exercises(*, exercise:exercises!exercise_id(*), alt_exercise:exercises!alt_exercise_id(*)))",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("sets").select("*").eq("workout_id", id).order("created_at"),
    supabase.from("exercises").select("id, name, sets(count)").order("name"),
  ]);
  if (!workoutRes.data) notFound();

  const { routine, ...workout } = workoutRes.data as unknown as Workout & {
    routine: { routine_exercises: RoutineExercise[] } | null;
  };
  const w = workout as Workout;
  const items = [...(routine?.routine_exercises ?? [])].sort((x, y) => x.position - y.position);
  const sets = (setsRes.data ?? []) as SetRow[];

  // Mejor serie de la sesión anterior de cada ejercicio (para superarla).
  const lastBest: Record<string, LastBest> = {};
  // Todas las series (con calentamientos) de esa sesión anterior, en orden: base del plan serie por serie.
  const lastSets: Record<string, LastSetRow[]> = {};
  const exerciseIds = items.flatMap((i) =>
    i.alt_exercise_id ? [i.exercise_id, i.alt_exercise_id] : [i.exercise_id],
  );
  if (exerciseIds.length > 0) {
    const { data: prev } = await supabase
      .from("sets")
      .select("exercise_id, workout_id, kind, weight_kg, reps, rir, created_at")
      .in("exercise_id", exerciseIds)
      .in("kind", ["normal", "warmup"])
      .neq("workout_id", id)
      .order("created_at", { ascending: false })
      .limit(400);

    const latestWorkout: Record<string, string> = {};
    for (const s of prev ?? []) {
      if (s.kind === "normal" && !latestWorkout[s.exercise_id]) latestWorkout[s.exercise_id] = s.workout_id;
    }
    for (const s of [...(prev ?? [])].reverse()) {
      if (s.workout_id !== latestWorkout[s.exercise_id]) continue;
      (lastSets[s.exercise_id] ??= []).push({ kind: s.kind, weight_kg: Number(s.weight_kg), reps: s.reps, rir: s.rir });
    }
    for (const s of prev ?? []) {
      if (s.workout_id !== latestWorkout[s.exercise_id] || s.kind !== "normal") continue;
      const cur = lastBest[s.exercise_id];
      const weight = Number(s.weight_kg);
      if (!cur || weight > cur.weight_kg || (weight === cur.weight_kg && s.reps > cur.reps)) {
        lastBest[s.exercise_id] = { weight_kg: weight, reps: s.reps, rir: s.rir };
      }
    }
  }

  // Ejercicios con series guardadas: para ligar uno nuevo con su nombre anterior.
  const history = ((exRes.data ?? []) as { id: string; name: string; sets: { count: number }[] }[])
    .map((e) => ({ id: e.id, name: e.name, sets: e.sets?.[0]?.count ?? 0 }))
    .filter((e) => e.sets > 0);

  return (
    <SessionView
      workout={w}
      items={items}
      sets={sets.map((s) => ({ ...s, weight_kg: Number(s.weight_kg) }))}
      lastBest={lastBest}
      lastSets={lastSets}
      history={history}
      unit={unit}
    />
  );
}
