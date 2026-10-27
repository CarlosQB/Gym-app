import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDayMonth, minutesBetween } from "@/lib/dates";
import { getUnit } from "@/lib/unit.server";
import { EditSets, type EditableSet } from "./EditSets";
import { DeleteWorkoutButton } from "./DeleteWorkoutButton";
import { WorkoutSummary } from "./WorkoutSummary";

type Row = EditableSet & { exercise: { name: string; muscle_group: string } | null };

export default async function HistorialDetallePage(props: PageProps<"/historial/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const unit = await getUnit();

  const { data: workout } = await supabase
    .from("workouts")
    .select("id, name, started_at, ended_at")
    .eq("id", id)
    .maybeSingle();
  if (!workout) notFound();

  const { data } = await supabase
    .from("sets")
    .select("id, exercise_id, set_number, kind, weight_kg, reps, rir, is_pr, exercise:exercises(name, muscle_group)")
    .eq("workout_id", id)
    .order("created_at");
  const rows = (data ?? []) as unknown as Row[];

  const groups: { exerciseId: string; name: string; sets: EditableSet[] }[] = [];
  for (const r of rows) {
    let g = groups.find((x) => x.exerciseId === r.exercise_id);
    if (!g) {
      g = { exerciseId: r.exercise_id, name: r.exercise?.name ?? "Ejercicio", sets: [] };
      groups.push(g);
    }
    g.sets.push({ ...r, weight_kg: Number(r.weight_kg) });
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

      {groups.length > 0 && (
        <WorkoutSummary
          unit={unit}
          exercises={groups.length}
          minutes={workout.ended_at ? minutesBetween(workout.started_at, workout.ended_at) : null}
          sets={rows.map((r) => ({
            kind: r.kind,
            weight_kg: Number(r.weight_kg),
            reps: r.reps,
            rir: r.rir,
            is_pr: r.is_pr,
            muscle: r.exercise?.muscle_group ?? "Otro",
          }))}
        />
      )}

      {groups.length === 0 ? (
        <p className="text-muted">Esta sesión no tiene series.</p>
      ) : (
        groups.map((g) => (
          <section key={g.exerciseId} className="rounded-2xl bg-surface p-4">
            <h2 className="mb-2 text-[15px] font-semibold">{g.name}</h2>
            <EditSets workoutId={id} sets={g.sets} unit={unit} />
          </section>
        ))
      )}

      <DeleteWorkoutButton workoutId={id} />
    </div>
  );
}
