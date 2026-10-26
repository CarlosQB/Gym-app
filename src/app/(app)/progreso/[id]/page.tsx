import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDayMonth } from "@/lib/dates";
import { getUnit } from "@/lib/unit.server";
import { toDisplay } from "@/lib/units";
import { ExerciseChart, type Point } from "./ExerciseChart";

type Row = {
  weight_kg: number;
  reps: number;
  rir: number | null;
  workout_id: string;
  workout: { started_at: string } | null;
};

// 1RM estimado con la fórmula de Epley (es una estimación).
const epley = (w: number, r: number) => (r <= 1 ? w : w * (1 + r / 30));

export default async function EjercicioProgresoPage(props: PageProps<"/progreso/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const unit = await getUnit();

  const { data: ex } = await supabase.from("exercises").select("id, name, muscle_group").eq("id", id).maybeSingle();
  if (!ex) notFound();

  const { data } = await supabase
    .from("sets")
    .select("weight_kg, reps, rir, workout_id, workout:workouts(started_at)")
    .eq("exercise_id", id)
    .eq("kind", "normal")
    .limit(3000);
  const rows = (data ?? []) as unknown as Row[];

  const byWorkout = new Map<string, { date: string; best: { w: number; r: number }; oneRm: number; sets: number }>();
  for (const r of rows) {
    if (!r.workout) continue;
    const w = Number(r.weight_kg);
    const cur = byWorkout.get(r.workout_id);
    const rm = epley(w, r.reps);
    if (!cur) {
      byWorkout.set(r.workout_id, { date: r.workout.started_at, best: { w, r: r.reps }, oneRm: rm, sets: 1 });
    } else {
      cur.sets += 1;
      if (w > cur.best.w || (w === cur.best.w && r.reps > cur.best.r)) cur.best = { w, r: r.reps };
      if (rm > cur.oneRm) cur.oneRm = rm;
    }
  }
  const sessions = [...byWorkout.values()].sort((a, b) => a.date.localeCompare(b.date));
  const points: Point[] = sessions.map((s) => ({
    label: formatDayMonth(new Date(s.date)),
    peso: toDisplay(s.best.w, unit),
    rm: Math.round(toDisplay(s.oneRm, unit) * 10) / 10,
  }));
  const prWeight = sessions.reduce((m, s) => Math.max(m, s.best.w), 0);
  const bestRm = sessions.reduce((m, s) => Math.max(m, s.oneRm), 0);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <Link href="/progreso" className="text-sm text-muted">
          ← Progreso
        </Link>
        <p className="mt-2 text-sm text-muted">{ex.muscle_group}</p>
        <h1 className="font-display text-[34px] font-bold leading-[1.1]">{ex.name}</h1>
      </header>

      {sessions.length === 0 ? (
        <p className="text-muted">Todavía no hay series de este ejercicio.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-surface p-4">
              <p className="text-xs text-muted">Mejor peso</p>
              <p className="tabular font-display text-3xl font-bold text-accent">{toDisplay(prWeight, unit)} {unit}</p>
            </div>
            <div className="rounded-2xl bg-surface p-4">
              <p className="text-xs text-muted">1RM estimado (Epley)</p>
              <p className="tabular font-display text-3xl font-bold">{Math.round(toDisplay(bestRm, unit) * 10) / 10} {unit}</p>
            </div>
          </div>

          <section className="rounded-2xl bg-surface p-4">
            <h2 className="mb-2 font-display text-xl font-bold">Mejor serie por sesión</h2>
            <ExerciseChart data={points} unit={unit} />
          </section>

          <section className="rounded-2xl bg-surface p-4">
            {[...sessions].reverse().map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-t border-line py-2.5 first:border-t-0"
              >
                <span className="text-[15px]">{formatDayMonth(new Date(s.date))}</span>
                <span className="tabular text-sm text-muted">
                  {toDisplay(s.best.w, unit)} {unit} × {s.best.r} · {s.sets} series · 1RM ≈ {Math.round(toDisplay(s.oneRm, unit) * 10) / 10} {unit}
                </span>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
