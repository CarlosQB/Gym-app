import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDayMonth } from "@/lib/dates";
import { getUnit } from "@/lib/unit.server";
import { toDisplay } from "@/lib/units";
import { exerciseType } from "@/lib/coach";
import { ColumnBars, StatTile } from "@/components/Stats";
import { ExerciseChartLazy as ExerciseChart } from "./ExerciseChartLazy";
import type { Point } from "./ExerciseChart";

type Row = {
  kind: string;
  weight_kg: number;
  reps: number;
  rir: number | null;
  is_pr: boolean;
  created_at: string;
  workout_id: string;
  workout: { started_at: string } | null;
};

// 1RM estimado con la fórmula de Epley (es una estimación).
const epley = (w: number, r: number) => (r <= 1 ? w : w * (1 + r / 30));
const nf = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
const n1 = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });

export default async function EjercicioProgresoPage(props: PageProps<"/progreso/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const unit = await getUnit();
  const d = (lb: number) => toDisplay(lb, unit);

  const { data: ex } = await supabase.from("exercises").select("id, name, muscle_group").eq("id", id).maybeSingle();
  if (!ex) notFound();

  const { data } = await supabase
    .from("sets")
    .select("kind, weight_kg, reps, rir, is_pr, created_at, workout_id, workout:workouts(started_at)")
    .eq("exercise_id", id)
    .in("kind", ["normal", "dropset"])
    .order("created_at")
    .limit(3000);
  const rows = (data ?? []) as unknown as Row[];

  type Session = { date: string; sets: Row[]; best: Row; rm: number; volume: number };
  const byWorkout = new Map<string, Session>();
  for (const r of rows) {
    if (!r.workout) continue;
    const row = { ...r, weight_kg: Number(r.weight_kg) };
    let s = byWorkout.get(r.workout_id);
    if (!s) {
      s = { date: r.workout.started_at, sets: [], best: row, rm: 0, volume: 0 };
      byWorkout.set(r.workout_id, s);
    }
    s.sets.push(row);
    s.volume += row.weight_kg * row.reps;
    if (row.kind === "normal") {
      const rm = epley(row.weight_kg, row.reps);
      if (rm > s.rm) {
        s.rm = rm;
        s.best = row;
      }
    }
  }
  const sessions = [...byWorkout.values()].filter((s) => s.rm > 0).sort((a, b) => a.date.localeCompare(b.date));
  const points: Point[] = sessions.map((s) => ({
    label: formatDayMonth(new Date(s.date)),
    peso: d(s.best.weight_kg),
    rm: Math.round(d(s.rm) * 10) / 10,
  }));
  const prWeight = sessions.reduce((m, s) => Math.max(m, s.best.weight_kg), 0);
  const bestRm = sessions.reduce((m, s) => Math.max(m, s.rm), 0);
  const first = sessions[0];
  const last = sessions[sessions.length - 1];
  const since = first && last && sessions.length > 1 ? (last.rm - first.rm) / first.rm : null;

  // Estancado (estimación): las últimas 3 sesiones sin superar el mejor 1RM previo a ellas.
  const recent = sessions.slice(-3);
  const before = sessions.slice(0, -3);
  const bestBefore = before.reduce((m, s) => Math.max(m, s.rm), 0);
  const stalled = before.length > 0 && recent.length === 3 && recent.every((s) => s.rm <= bestBefore);
  const type = exerciseType(ex.name);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <Link href="/progreso" className="text-sm text-muted">
          ← Progreso
        </Link>
        <p className="mt-2 text-sm text-muted">
          {ex.muscle_group} · {type === "compuesto" ? "Compuesto" : "Aislado"}
        </p>
        <h1 className="font-display text-[34px] font-bold leading-[1.1]">{ex.name}</h1>
      </header>

      {sessions.length === 0 ? (
        <p className="text-muted">Todavía no hay series de este ejercicio.</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-2 rounded-2xl bg-surface p-3">
            <StatTile label="Mejor peso" value={`${n1.format(d(prWeight))} ${unit}`} />
            <StatTile label="1RM estimado" value={`${n1.format(d(bestRm))} ${unit}`} />
            <StatTile label="Sesiones" value={String(sessions.length)} hint={`desde ${formatDayMonth(new Date(first.date))}`} />
            <StatTile
              label="Desde la primera"
              value={since === null ? "—" : `${since >= 0 ? "+" : "−"}${Math.abs(Math.round(since * 100))}%`}
              hint="en 1RM estimado"
            />
          </dl>

          {stalled && (
            <p className="rounded-2xl bg-accent-dim p-3 text-sm text-text ring-1 ring-[#3a4020]">
              <strong className="text-accent">Estancado 3 sesiones.</strong>{" "}
              {type === "compuesto"
                ? "Prueba una semana más ligera (−10% de peso) y vuelve a subir, o cambia el rango de reps."
                : "Prueba otro rango de reps (p. ej. 12–15), un dropset en la última serie o una variante parecida."}{" "}
              <span className="text-muted">(estimación)</span>
            </p>
          )}

          <section className="rounded-2xl bg-surface p-4">
            <h2 className="mb-2 font-display text-xl font-bold">Mejor serie por sesión</h2>
            <ExerciseChart data={points} unit={unit} />
          </section>

          <section className="flex flex-col gap-2 rounded-2xl bg-surface p-4">
            <h2 className="font-display text-xl font-bold">Volumen por sesión</h2>
            <ColumnBars
              data={sessions.slice(-8).map((s) => ({
                label: formatDayMonth(new Date(s.date)).replace(/^\S+\s/, ""),
                value: Math.round(d(s.volume)),
              }))}
              label={`Volumen por sesión en ${unit}`}
            />
          </section>

          <section aria-labelledby="sesiones" className="rounded-2xl bg-surface p-4">
            <h2 id="sesiones" className="mb-1 font-display text-xl font-bold">
              Sesiones
            </h2>
            <ul>
              {[...sessions].reverse().map((s, i, arr) => {
                const prev = arr[i + 1];
                const ch = prev ? s.rm - prev.rm : null;
                return (
                  <li key={s.date} className="border-t border-line py-2.5 first:border-t-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[15px]">{formatDayMonth(new Date(s.date))}</span>
                      <span
                        className={`tabular text-xs font-semibold ${
                          ch === null ? "text-muted" : ch > 0 ? "text-accent" : ch < 0 ? "text-warn" : "text-muted"
                        }`}
                      >
                        {ch === null ? "primera" : `${ch > 0 ? "▲" : ch < 0 ? "▼" : "="} 1RM ${n1.format(d(s.rm))}`}
                      </span>
                    </div>
                    <p className="tabular text-sm text-muted">
                      {s.sets.map((x, j) => (
                        <span key={j}>
                          {j > 0 && " · "}
                          {x.kind === "dropset" && <abbr title="Dropset">D </abbr>}
                          <span className={x === s.best ? "text-text" : ""}>
                            {n1.format(d(x.weight_kg))}×{x.reps}
                          </span>
                          {x.rir !== null ? `@${x.rir}` : ""}
                          {x.is_pr ? " ★" : ""}
                        </span>
                      ))}
                    </p>
                    <p className="text-xs text-muted">
                      Volumen {nf.format(d(s.volume))} {unit}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
