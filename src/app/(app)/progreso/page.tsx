import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { addDays, formatDayMonth, minutesBetween, weekStart } from "@/lib/dates";
import { getUnit } from "@/lib/unit.server";
import { toDisplay } from "@/lib/units";
import { ColumnBars, formatMinutes, StatTile } from "@/components/Stats";

// Rango objetivo de series efectivas por grupo muscular y semana (estimación, ajústalo a tu gusto).
const TARGET_MIN = 10;
const TARGET_MAX = 16;
const WEEKS = 8;

type W = { id: string; started_at: string; ended_at: string | null };
type S = {
  workout_id: string;
  exercise_id: string;
  kind: string;
  weight_kg: number;
  reps: number;
  rir: number | null;
  is_pr: boolean;
  created_at: string;
  exercise: { name: string; muscle_group: string } | null;
};

const nf = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
const epley = (w: number, r: number) => (r <= 1 ? w : w * (1 + r / 30)); // estimación

export const metadata = { title: "Progreso" };

export default async function ProgresoPage() {
  const supabase = await createClient();
  const unit = await getUnit();
  const d = (lb: number) => toDisplay(lb, unit);
  const thisWeek = weekStart(new Date());
  const lastWeek = addDays(thisWeek, -7);
  const firstWeek = addDays(thisWeek, -7 * (WEEKS - 1));
  // Un día de margen por la zona horaria; se filtra por semana local después.
  const since = new Date(`${addDays(firstWeek, -1)}T00:00:00Z`).toISOString();

  const { data: wData } = await supabase
    .from("workouts")
    .select("id, started_at, ended_at")
    .gte("started_at", since)
    .order("started_at");
  const workouts = ((wData ?? []) as W[]).filter((w) => weekStart(new Date(w.started_at)) >= firstWeek);
  const ids = workouts.map((w) => w.id);
  const { data: sData } = ids.length
    ? await supabase
        .from("sets")
        .select("workout_id, exercise_id, kind, weight_kg, reps, rir, is_pr, created_at, exercise:exercises(name, muscle_group)")
        .in("workout_id", ids)
        .order("created_at")
        .limit(6000)
    : { data: [] };
  const sets = ((sData ?? []) as unknown as S[]).map((s) => ({ ...s, weight_kg: Number(s.weight_kg) }));

  const weekOf = new Map(workouts.map((w) => [w.id, weekStart(new Date(w.started_at))]));
  const dateOf = new Map(workouts.map((w) => [w.id, w.started_at]));
  const work = sets.filter((s) => s.kind !== "warmup");

  // Resumen de una semana: sesiones, minutos, series normales y volumen.
  function week(ws: string) {
    const wk = workouts.filter((w) => weekOf.get(w.id) === ws);
    const wkIds = new Set(wk.map((w) => w.id));
    const ss = work.filter((s) => wkIds.has(s.workout_id));
    return {
      sessions: wk.length,
      minutes: wk.reduce((a, w) => a + (w.ended_at ? minutesBetween(w.started_at, w.ended_at) : 0), 0),
      sets: ss.filter((s) => s.kind === "normal").length,
      volume: ss.reduce((a, s) => a + s.weight_kg * s.reps, 0),
      prs: ss.filter((s) => s.is_pr).length,
    };
  }
  const cur = week(thisWeek);
  const prev = week(lastWeek);

  const weeks = Array.from({ length: WEEKS }, (_, i) => addDays(firstWeek, 7 * i));
  const volumeBars = weeks.map((ws) => ({
    label: ws === thisWeek ? "Esta" : `${Number(ws.slice(8))}/${Number(ws.slice(5, 7))}`,
    value: Math.round(d(week(ws).volume)),
  }));

  // Series efectivas por músculo (normales con RIR ≤ 4), esta semana y la pasada.
  const effective = (ws: string) => {
    const m = new Map<string, number>();
    for (const s of work) {
      if (s.kind !== "normal" || weekOf.get(s.workout_id) !== ws || (s.rir !== null && s.rir > 4)) continue;
      const g = s.exercise?.muscle_group ?? "Otro";
      m.set(g, (m.get(g) ?? 0) + 1);
    }
    return m;
  };
  const effNow = effective(thisWeek);
  const effPrev = effective(lastWeek);
  const muscles = [...new Set([...effNow.keys(), ...effPrev.keys()])].sort(
    (a, b) => (effNow.get(b) ?? 0) - (effNow.get(a) ?? 0),
  );

  // Por ejercicio: última sesión contra la anterior (1RM estimado de la mejor serie).
  type Ex = { id: string; name: string; group: string; sessions: { wid: string; date: string; best: S; rm: number }[] };
  const exMap = new Map<string, Ex>();
  for (const s of work.filter((x) => x.kind === "normal")) {
    let e = exMap.get(s.exercise_id);
    if (!e) {
      e = { id: s.exercise_id, name: s.exercise?.name ?? "Ejercicio", group: s.exercise?.muscle_group ?? "Otro", sessions: [] };
      exMap.set(s.exercise_id, e);
    }
    let ses = e.sessions.find((x) => x.wid === s.workout_id);
    const rm = epley(s.weight_kg, s.reps);
    if (!ses) {
      ses = { wid: s.workout_id, date: dateOf.get(s.workout_id) ?? s.created_at, best: s, rm };
      e.sessions.push(ses);
    } else if (rm > ses.rm) {
      ses.best = s;
      ses.rm = rm;
    }
  }
  const exercises = [...exMap.values()]
    .map((e) => {
      const ss = [...e.sessions].sort((a, b) => a.date.localeCompare(b.date));
      const last = ss[ss.length - 1];
      const before = ss[ss.length - 2];
      const change = before ? (last.rm - before.rm) / before.rm : null;
      return { ...e, last, change };
    })
    .sort((a, b) => a.group.localeCompare(b.group, "es") || a.name.localeCompare(b.name, "es"));
  const groups = [...new Set(exercises.map((e) => e.group))];
  const improving = exercises.filter((e) => (e.change ?? 0) > 0.005).length;
  const withTrend = exercises.filter((e) => e.change !== null).length;

  const prs = work
    .filter((s) => s.is_pr)
    .slice(-6)
    .reverse();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-[38px] font-bold leading-[1.05]">Progreso</h1>

      <section aria-labelledby="semana" className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
        <h2 id="semana" className="font-display text-2xl font-bold">
          Esta semana
        </h2>
        <dl className="grid grid-cols-2 gap-2">
          <StatTile label="Sesiones" value={String(cur.sessions)} delta={cur.sessions - prev.sessions} />
          <StatTile
            label="Tiempo"
            value={formatMinutes(cur.minutes)}
            delta={cur.minutes - prev.minutes}
            deltaLabel={formatMinutes(Math.abs(cur.minutes - prev.minutes))}
          />
          <StatTile label="Series de trabajo" value={String(cur.sets)} delta={cur.sets - prev.sets} />
          <StatTile
            label={`Volumen (${unit})`}
            value={nf.format(d(cur.volume))}
            delta={Math.round(d(cur.volume - prev.volume))}
          />
        </dl>
        {withTrend > 0 && (
          <p className="text-sm text-muted">
            Mejoraste en <strong className="text-text">{improving}</strong> de {withTrend} ejercicios contra su sesión
            anterior{cur.prs ? ` y llevas ${cur.prs} ${cur.prs === 1 ? "récord" : "récords"} esta semana` : ""}.
          </p>
        )}
      </section>

      <section aria-labelledby="vol" className="flex flex-col gap-2 rounded-2xl bg-surface p-4">
        <h2 id="vol" className="font-display text-2xl font-bold">
          Volumen por semana
        </h2>
        <p className="text-xs text-muted">Peso × reps de series de trabajo ({unit}), últimas {WEEKS} semanas.</p>
        <ColumnBars data={volumeBars} label={`Volumen por semana en ${unit}`} />
      </section>

      <section aria-labelledby="musculo" className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
        <div>
          <h2 id="musculo" className="font-display text-2xl font-bold">
            Series efectivas por músculo
          </h2>
          <p className="text-xs text-muted">
            Normales con RIR ≤ 4. La rayita marca {TARGET_MIN}, el mínimo sugerido por semana (estimación).
          </p>
        </div>
        {muscles.length === 0 ? (
          <p className="text-sm text-muted">Aún no hay series esta semana.</p>
        ) : (
          muscles.map((g) => {
            const n = effNow.get(g) ?? 0;
            const before = effPrev.get(g);
            const ok = n >= TARGET_MIN;
            return (
              <div key={g} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between text-[15px]">
                  <span>{g}</span>
                  <span className="tabular text-muted">
                    <span className={ok ? "font-semibold text-accent" : "font-semibold text-text"}>{n}</span>
                    {before !== undefined && ` · sem. pasada ${before}`}
                  </span>
                </div>
                <div className="relative h-2 rounded-full bg-surface-2">
                  <div
                    className={`h-2 rounded-full ${ok ? "bg-accent" : "bg-muted"}`}
                    style={{ width: `${Math.min(100, (n / TARGET_MAX) * 100)}%` }}
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

      <section aria-labelledby="ejercicios" className="flex flex-col gap-2 rounded-2xl bg-surface p-4">
        <h2 id="ejercicios" className="font-display text-2xl font-bold">
          Tus ejercicios
        </h2>
        <p className="text-xs text-muted">
          Mejor serie de la última sesión y cambio de 1RM estimado contra la anterior. Toca uno para ver su gráfica.
        </p>
        {exercises.length === 0 ? (
          <p className="text-sm text-muted">Guarda series y aquí verás cómo avanza cada ejercicio.</p>
        ) : (
          groups.map((g) => (
            <div key={g}>
              <h3 className="mt-2 text-xs font-semibold tracking-[0.08em] text-muted">{g.toUpperCase()}</h3>
              <ul>
                {exercises
                  .filter((e) => e.group === g)
                  .map((e) => {
                    const c = e.change;
                    const cls = c === null ? "text-muted" : c > 0.005 ? "text-accent" : c < -0.005 ? "text-warn" : "text-muted";
                    return (
                      <li key={e.id}>
                        <Link
                          href={`/progreso/${e.id}`}
                          className="flex min-h-12 items-center justify-between gap-2 border-t border-line py-2 first:border-t-0"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-[15px]">{e.name}</span>
                            <span className="tabular text-xs text-muted">
                              {formatDayMonth(new Date(e.last.date))} · {nf.format(d(e.last.best.weight_kg))} {unit} ×{" "}
                              {e.last.best.reps}
                            </span>
                          </span>
                          <span className={`tabular shrink-0 text-sm font-semibold ${cls}`}>
                            {c === null
                              ? "nuevo"
                              : `${c > 0.005 ? "▲" : c < -0.005 ? "▼" : "="} ${Math.abs(Math.round(c * 100))}%`}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))
        )}
      </section>

      <section aria-labelledby="prs" className="flex flex-col gap-1 rounded-2xl bg-surface p-4">
        <h2 id="prs" className="font-display text-2xl font-bold">
          Últimos récords
        </h2>
        {prs.length === 0 ? (
          <p className="text-sm text-muted">Sin récords en las últimas {WEEKS} semanas. Se marcan al superar tu mejor peso.</p>
        ) : (
          prs.map((p, i) => (
            <Link
              key={i}
              href={`/progreso/${p.exercise_id}`}
              className="flex min-h-11 items-center justify-between border-t border-line py-2 first:border-t-0"
            >
              <span className="text-[15px]">{p.exercise?.name}</span>
              <span className="tabular text-sm text-muted">
                <span className="font-semibold text-warn">
                  ★ {nf.format(d(p.weight_kg))} {unit} × {p.reps}
                </span>{" "}
                · {formatDayMonth(new Date(p.created_at))}
              </span>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
