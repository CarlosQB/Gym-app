import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { addDays, formatDayMonth, weekStart } from "@/lib/dates";
import { getUnit } from "@/lib/unit.server";
import { toDisplay } from "@/lib/units";

// Rango objetivo de series efectivas por grupo muscular y semana (estimación, ajústalo a tu gusto).
const TARGET_MIN = 10;
const TARGET_MAX = 16;

type MuscleRow = { week_start: string; muscle_group: string; effective_sets: number };
type ExerciseRow = { id: string; name: string; muscle_group: string; sets: { count: number }[] };
type PrRow = {
  weight_kg: number;
  reps: number;
  created_at: string;
  exercise: { name: string } | null;
  exercise_id: string;
};

export default async function ProgresoPage() {
  const supabase = await createClient();
  const unit = await getUnit();
  const now = new Date();
  const thisWeek = weekStart(now);
  const lastWeek = addDays(thisWeek, -7);

  const [muscleRes, exRes, prRes] = await Promise.all([
    supabase.from("weekly_muscle_sets").select("week_start, muscle_group, effective_sets").gte("week_start", lastWeek),
    supabase.from("exercises").select("id, name, muscle_group, sets(count)"),
    supabase
      .from("sets")
      .select("weight_kg, reps, created_at, exercise_id, exercise:exercises(name)")
      .eq("is_pr", true)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const muscle = (muscleRes.data ?? []) as MuscleRow[];
  const current = muscle.filter((m) => m.week_start === thisWeek).sort((a, b) => b.effective_sets - a.effective_sets);
  const prevMap = new Map(muscle.filter((m) => m.week_start === lastWeek).map((m) => [m.muscle_group, m.effective_sets]));

  const exercises = ((exRes.data ?? []) as ExerciseRow[])
    .filter((e) => (e.sets?.[0]?.count ?? 0) > 0)
    .map((e) => [e.id, { name: e.name, group: e.muscle_group }] as const)
    .sort((a, b) => a[1].name.localeCompare(b[1].name, "es"));
  const prs = (prRes.data ?? []) as unknown as PrRow[];

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-[38px] font-bold leading-[1.05]">Progreso</h1>

      <section className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Series efectivas esta semana</h2>
          <p className="text-xs text-muted">
            Series normales con RIR ≤ 4. Objetivo {TARGET_MIN}–{TARGET_MAX} por grupo (estimación).
          </p>
        </div>
        {current.length === 0 ? (
          <p className="text-sm text-muted">Aún no hay series esta semana.</p>
        ) : (
          current.map((m) => {
            const pct = Math.min(100, (m.effective_sets / TARGET_MAX) * 100);
            const ok = m.effective_sets >= TARGET_MIN;
            const before = prevMap.get(m.muscle_group);
            return (
              <div key={m.muscle_group} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between text-[15px]">
                  <span>{m.muscle_group}</span>
                  <span className="tabular text-muted">
                    <span className={ok ? "font-semibold text-accent" : "font-semibold text-text"}>
                      {m.effective_sets}
                    </span>
                    {before !== undefined && ` · sem. pasada ${before}`}
                  </span>
                </div>
                <div className="relative h-2 rounded-full bg-surface-2">
                  <div
                    className={`h-2 rounded-full ${ok ? "bg-accent" : "bg-muted"}`}
                    style={{ width: `${pct}%` }}
                  />
                  <span
                    aria-hidden="true"
                    className="absolute top-[-3px] h-[14px] w-px bg-text/60"
                    style={{ left: `${(TARGET_MIN / TARGET_MAX) * 100}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </section>

      <section className="flex flex-col gap-1 rounded-2xl bg-surface p-4">
        <h2 className="font-display text-2xl font-bold">Últimos PR</h2>
        {prs.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay PRs. Se marcan al superar tu mejor peso.</p>
        ) : (
          prs.map((p, i) => (
            <Link
              key={i}
              href={`/progreso/${p.exercise_id}`}
              className="flex items-center justify-between border-t border-line py-2.5 first:border-t-0"
            >
              <span className="text-[15px]">{p.exercise?.name}</span>
              <span className="tabular text-sm text-muted">
                <span className="font-semibold text-warn">
                  {toDisplay(Number(p.weight_kg), unit)} {unit} × {p.reps}
                </span>{" "}
                · {formatDayMonth(new Date(p.created_at))}
              </span>
            </Link>
          ))
        )}
      </section>

      <section className="flex flex-col rounded-2xl bg-surface p-4">
        <h2 className="mb-1 font-display text-2xl font-bold">Historial por ejercicio</h2>
        {exercises.length === 0 ? (
          <p className="text-sm text-muted">Guarda series y aquí verás la gráfica de cada ejercicio.</p>
        ) : (
          exercises.map(([id, e]) => (
            <Link
              key={id}
              href={`/progreso/${id}`}
              className="flex items-center justify-between border-t border-line py-2.5 first:border-t-0"
            >
              <span className="text-[15px]">{e.name}</span>
              <span className="text-sm text-muted">{e.group} ›</span>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
