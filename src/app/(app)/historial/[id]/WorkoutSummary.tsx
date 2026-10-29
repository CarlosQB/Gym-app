import { toDisplay, type Unit } from "@/lib/units";
import { EditSets, type EditableSet } from "./EditSets";
import { CoachTips } from "@/components/SessionExtras";
import { coachTips, exerciseType, type CoachTarget } from "@/lib/coach";

export type SummarySet = EditableSet & { exerciseId: string; name: string; muscle: string };

export type PrevSet = { exerciseId: string; workoutId: string; weight_kg: number; reps: number };

const nf = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
const n1 = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const epley = (w: number, r: number) => w * (1 + r / 30); // estimación
const sign = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "±");

type Trend = "up" | "same" | "down";
const trendOf = (w: number, r: number, pw: number, pr: number): Trend =>
  w > pw || (w === pw && r > pr) ? "up" : w === pw && r === pr ? "same" : "down";
const TREND = {
  up: { icon: "▲", label: "mejor", cls: "text-accent" },
  same: { icon: "=", label: "igual", cls: "text-muted" },
  down: { icon: "▼", label: "menos", cls: "text-warn" },
} as const;

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-bg p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="tabular font-display text-[26px] font-bold leading-tight">{value}</dd>
      {hint && <dd className="text-xs text-muted">{hint}</dd>}
    </div>
  );
}

export function WorkoutSummary({
  workoutId,
  sets,
  prev,
  targets,
  minutes,
  unit,
}: {
  workoutId: string;
  sets: SummarySet[];
  prev: PrevSet[];
  targets: Record<string, CoachTarget & { position: number }>;
  minutes: number | null;
  unit: Unit;
}) {
  const d = (lb: number) => toDisplay(lb, unit);
  const work = sets.filter((s) => s.kind !== "warmup");
  const normal = work.filter((s) => s.kind === "normal");
  const effective = normal.filter((s) => s.rir !== null && s.rir <= 4).length; // estimación
  const volume = work.reduce((a, s) => a + s.weight_kg * s.reps, 0);
  const rirs = normal.filter((s) => s.rir !== null).map((s) => s.rir as number);
  const avgRir = rirs.length ? rirs.reduce((a, b) => a + b, 0) / rirs.length : null;
  const prs = work.filter((s) => s.is_pr).length;

  // Orden de aparición de ejercicios.
  const order: string[] = [];
  for (const s of sets) if (!order.includes(s.exerciseId)) order.push(s.exerciseId);

  const rows = order.map((id) => {
    const all = sets.filter((s) => s.exerciseId === id);
    const w = all.filter((s) => s.kind !== "warmup");
    const vol = w.reduce((a, s) => a + s.weight_kg * s.reps, 0);
    const e1rm = w.reduce((m, s) => Math.max(m, epley(s.weight_kg, s.reps)), 0);
    const best = w.reduce<SummarySet | null>(
      (b, s) => (!b || s.weight_kg > b.weight_kg || (s.weight_kg === b.weight_kg && s.reps > b.reps) ? s : b),
      null,
    );

    // Última sesión anterior con este ejercicio, en el orden en que se hicieron las series.
    const p = prev.filter((x) => x.exerciseId === id);
    const lastWid = p[0]?.workoutId;
    const pl = p.filter((x) => x.workoutId === lastWid).reverse();
    const pVol = pl.reduce((a, s) => a + s.weight_kg * s.reps, 0);
    const pBest = pl.reduce<PrevSet | null>(
      (b, s) => (!b || s.weight_kg > b.weight_kg || (s.weight_kg === b.weight_kg && s.reps > b.reps) ? s : b),
      null,
    );
    // Número de serie de trabajo (los calentamientos no cuentan) para comparar contra la misma serie de antes.
    const normals = w.filter((s) => s.kind === "normal");
    const workIdx = all.map((s) => (s.kind === "normal" ? normals.indexOf(s) : -1));
    const trend = best && pBest ? trendOf(best.weight_kg, best.reps, pBest.weight_kg, pBest.reps) : null;
    const type = exerciseType(all[0].name, targets[id]?.position);
    const tips = targets[id]
      ? coachTips(
          all.map((s) => ({ kind: s.kind, weight: s.weight_kg, reps: s.reps, rir: s.rir })),
          targets[id],
          type,
        )
      : [];
    return { id, name: all[0].name, muscle: all[0].muscle, all, workIdx, vol, e1rm, pl, pVol, trend, tips, type };
  });

  const byMuscle = new Map<string, number>();
  for (const s of work) byMuscle.set(s.muscle, (byMuscle.get(s.muscle) ?? 0) + 1);
  const muscles = [...byMuscle.entries()].sort((a, b) => b[1] - a[1]);
  const maxMuscle = muscles[0]?.[1] ?? 1;

  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="resumen" className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
        <h2 id="resumen" className="font-display text-2xl font-bold">
          Resumen
        </h2>
        <dl className="grid grid-cols-2 gap-2">
          <Tile label="Duración" value={minutes ? `${minutes} min` : "—"} hint={minutes ? undefined : "Sin terminar"} />
          <Tile
            label="Series de trabajo"
            value={String(normal.length)}
            hint={
              [
                work.length > normal.length ? `+ ${work.length - normal.length} dropset` : "",
                sets.length > work.length ? `+ ${sets.length - work.length} calent.` : "",
              ]
                .filter(Boolean)
                .join(" · ") || undefined
            }
          />
          <Tile label={`Volumen (${unit})`} value={nf.format(d(volume))} />
          <Tile
            label="RIR promedio"
            value={avgRir !== null ? n1.format(avgRir) : "—"}
            hint={prs ? `★ ${prs} ${prs === 1 ? "récord" : "récords"}` : undefined}
          />
        </dl>

        {muscles.length > 0 && (
          <div>
            <h3 className="mb-1.5 text-sm font-semibold">Series por músculo</h3>
            <ul className="flex flex-col gap-1.5">
              {muscles.map(([m, n]) => (
                <li key={m} className="grid grid-cols-[5.5rem_1fr_1.5rem] items-center gap-2 text-sm">
                  <span className="truncate text-muted">{m}</span>
                  <span className="h-3 rounded-full bg-bg" aria-hidden>
                    <span className="block h-3 rounded-full bg-accent" style={{ width: `${(n / maxMuscle) * 100}%` }} />
                  </span>
                  <span className="tabular text-right">{n}</span>
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-xs text-muted">Series efectivas (normales con RIR ≤ 4): {effective} (estimación).</p>
          </div>
        )}
      </section>

      {rows.map((r) => (
        <section key={r.id} aria-labelledby={`ex-${r.id}`} className="flex flex-col gap-2 rounded-2xl bg-surface p-4">
          <header className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 id={`ex-${r.id}`} className="text-[17px] font-semibold leading-snug">
                {r.name}
              </h2>
              <p className="text-xs text-muted">{r.muscle}</p>
            </div>
            {r.trend ? (
              <span className={`shrink-0 rounded-full bg-bg px-2.5 py-1 text-xs font-semibold ${TREND[r.trend].cls}`}>
                {TREND[r.trend].icon} {r.trend === "up" ? "Subiste" : r.trend === "same" ? "Igual" : "Bajaste"}
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-bg px-2.5 py-1 text-xs text-muted">Primera vez</span>
            )}
          </header>

          <table className="w-full text-left text-sm">
            <caption className="sr-only">Series de {r.name}, comparadas con la sesión anterior</caption>
            <thead className="text-xs text-muted">
              <tr>
                <th scope="col" className="w-8 py-1 font-normal">
                  #
                </th>
                <th scope="col" className="py-1 font-normal">
                  Peso
                </th>
                <th scope="col" className="py-1 text-center font-normal">
                  Reps
                </th>
                <th scope="col" className="py-1 text-center font-normal">
                  RIR
                </th>
                <th scope="col" className="py-1 text-right font-normal">
                  Antes
                </th>
              </tr>
            </thead>
            <tbody className="tabular">
              {r.all.map((s, i) => {
                const warm = s.kind === "warmup";
                const idx = r.workIdx[i];
                const p = idx >= 0 ? r.pl[idx] : undefined;
                const t = p ? TREND[trendOf(s.weight_kg, s.reps, p.weight_kg, p.reps)] : null;
                return (
                  <tr key={s.id} className={`border-t border-line ${warm ? "text-muted" : ""}`}>
                    <th scope="row" className="py-2 font-normal text-muted">
                      {warm ? (
                        <abbr title="Calentamiento">C</abbr>
                      ) : s.kind === "dropset" ? (
                        <abbr title="Dropset">D</abbr>
                      ) : (
                        idx + 1
                      )}
                    </th>
                    <td className="py-2 font-display text-lg font-bold">
                      {n1.format(d(s.weight_kg))} <span className="text-xs font-normal text-muted">{unit}</span>
                      {s.is_pr && (
                        <span className="ml-1 text-accent" title="Récord de peso">
                          ★<span className="sr-only"> récord</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-center font-display text-lg font-bold">{s.reps}</td>
                    <td className="py-2 text-center">{s.rir ?? "—"}</td>
                    <td className="py-2 text-right">
                      {p && t ? (
                        <span className="whitespace-nowrap">
                          <span className="text-muted">
                            {n1.format(d(p.weight_kg))}×{p.reps}
                          </span>{" "}
                          <span className={t.cls} aria-label={t.label}>
                            {t.icon}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p className="text-xs text-muted">
            Volumen {nf.format(d(r.vol))} {unit}
            {r.pl.length > 0 && ` (${sign(r.vol - r.pVol)}${nf.format(Math.abs(d(r.vol - r.pVol)))} vs antes)`}
            {r.e1rm > 0 && ` · 1RM est. ${nf.format(d(r.e1rm))} ${unit}`}
          </p>

          {r.tips.length > 0 && <CoachTips tips={r.tips} type={r.type} title="Para la próxima" />}

          <details className="group rounded-xl bg-bg">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-sm font-semibold">
              Editar series
              <span aria-hidden className="text-muted transition-transform group-open:rotate-180">
                ▾
              </span>
            </summary>
            <div className="px-3 pb-2">
              <EditSets workoutId={workoutId} sets={r.all} unit={unit} />
            </div>
          </details>
        </section>
      ))}

      <p className="text-xs text-muted">
        ▲ mejor que la vez pasada (más peso, o mismo peso con más reps) · ▼ menos · ★ récord. C = calentamiento, no
        cuenta en series ni volumen. D = dropset, suma volumen pero no cuenta como serie. 1RM y series efectivas son estimaciones.
      </p>
    </div>
  );
}
