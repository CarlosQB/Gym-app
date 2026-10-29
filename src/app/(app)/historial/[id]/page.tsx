import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDayMonth, minutesBetween } from "@/lib/dates";
import { getUnit } from "@/lib/unit.server";
import type { EditableSet } from "./EditSets";
import { DeleteWorkoutButton } from "./DeleteWorkoutButton";
import { WorkoutSummary, type PrevSet } from "./WorkoutSummary";
import type { CoachTarget } from "@/lib/coach";

type Row = EditableSet & { exercise: { name: string; muscle_group: string } | null };

export default async function HistorialDetallePage(props: PageProps<"/historial/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const unit = await getUnit();

  const { data: workout } = await supabase
    .from("workouts")
    .select("id, name, routine_id, started_at, ended_at")
    .eq("id", id)
    .maybeSingle();
  if (!workout) notFound();

  const { data } = await supabase
    .from("sets")
    .select("*, exercise:exercises(name, muscle_group)")
    .eq("workout_id", id)
    .order("created_at");
  const rows = (data ?? []) as unknown as Row[];

  // Sesiones anteriores de los mismos ejercicios, para comparar.
  const exIds = [...new Set(rows.map((r) => r.exercise_id))];
  let prev: PrevSet[] = [];
  if (exIds.length > 0) {
    const { data: p } = await supabase
      .from("sets")
      .select("exercise_id, workout_id, weight_kg, reps")
      .in("exercise_id", exIds)
      .eq("kind", "normal")
      .neq("workout_id", id)
      .lt("created_at", workout.started_at)
      .order("created_at", { ascending: false })
      .limit(500);
    prev = (p ?? []).map((x) => ({
      exerciseId: x.exercise_id as string,
      workoutId: x.workout_id as string,
      weight_kg: Number(x.weight_kg),
      reps: x.reps as number,
    }));
  }

  // Objetivos de la rutina de esa sesión, para los consejos de la próxima vez.
  const targets: Record<string, CoachTarget & { position: number }> = {};
  if (workout.routine_id) {
    const { data: res } = await supabase
      .from("routine_exercises")
      .select("exercise_id, alt_exercise_id, position, rep_min, rep_max, rir_min, rir_max, rest_seconds")
      .eq("routine_id", workout.routine_id);
    for (const r of res ?? []) {
      const t = {
        repMin: r.rep_min,
        repMax: r.rep_max,
        rirMin: r.rir_min,
        rirMax: r.rir_max,
        restSeconds: r.rest_seconds,
        position: r.position,
      };
      targets[r.exercise_id] = t;
      if (r.alt_exercise_id) targets[r.alt_exercise_id] = t;
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <Link href="/historial" className="text-sm text-muted">
          ← Historial
        </Link>
        <p className="mt-2 text-sm text-muted">
          {formatDayMonth(new Date(workout.started_at))}
          {workout.ended_at ? "" : " · sin terminar"}
        </p>
        <h1 className="font-display text-[34px] font-bold leading-[1.1]">{workout.name}</h1>
      </header>

      {rows.length === 0 ? (
        <p className="text-muted">Esta sesión no tiene series.</p>
      ) : (
        <WorkoutSummary
          workoutId={id}
          unit={unit}
          minutes={workout.ended_at ? minutesBetween(workout.started_at, workout.ended_at) : null}
          prev={prev}
          targets={targets}
          sets={rows.map(({ exercise, ...r }) => ({
            ...r,
            weight_kg: Number(r.weight_kg),
            exerciseId: r.exercise_id,
            name: exercise?.name ?? "Ejercicio",
            muscle: exercise?.muscle_group ?? "Otro",
          }))}
        />
      )}

      <DeleteWorkoutButton workoutId={id} />
    </div>
  );
}
