import { toDisplay, type Unit } from "@/lib/units";

export type SummarySet = {
  exerciseId: string;
  name: string;
  muscle: string;
  kind: string;
  weight_kg: number; // libras
  reps: number;
  rir: number | null;
  is_pr: boolean;
};

export type PrevSet = { exerciseId: string; workoutId: string; weight_kg: number; reps: number };

const nf = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
const n1 = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const epley = (w: number, r: number) => w * (1 + r / 30); // estimación
const sign = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "");

export function WorkoutSummary({
  sets,
  prev,
  minutes,
  unit,
}: {
  sets: SummarySet[];
  prev: PrevSet[];
  minutes: number | null;
  unit: Unit;
}) {
  const d = (lb: number) => toDisplay(lb, unit);
  const work = sets.filter((s) => s.kind !== "warmup");
  const normal = work.filter((s) => s.kind === "normal");
  const effective = normal.filter((s) => s.rir !== null && s.rir <= 4).length; // estimación
  const volume = work.reduce((a, s) => a + s.weight_kg * s.reps, 0);
  const reps = work.reduce((a, s) => a + s.reps, 0);
  const rirs = normal.filter((s) => s.rir !== null).map((s) => s.rir as number);
  const avgRir = rirs.length ? rirs.reduce((a, b) => a + b, 0) / rirs.length : null;
  const toFailure = normal.filter((s) => s.rir === 0).length;
  const prs = work.filter((s) => s.is_pr);

  // Orden de aparición de ejercicios.
  const order: string[] = [];
  for (const s of sets) if (!order.includes(s.exerciseId)) order.push(s.exerciseId);

  const rows = order.map((id) => {
    const all = sets.filter((s) => s.exerciseId === id);
    const w = all.filter((s) => s.kind !== "warmup");
    const warm = all.length - w.length;
    const best = w.reduce<SummarySet | null>(
      (b, s) => (!b || s.weight_kg > b.weight_kg || (s.weight_kg === b.weight_kg && s.reps > b.reps) ? s : b),
      null,
    );
    const vol = w.reduce((a, s) => a + s.weight_kg * s.reps, 0);
    const e1rm = w.reduce((m, s) => Math.max(m, epley(s.weight_kg, s.reps)), 0);

    // Última sesión anterior con este ejercicio.
    const p = prev.filter((x) => x.exerciseId === id);
    const lastWid = p[0]?.workoutId;
    const pl = p.filter((x) => x.workoutId === lastWid);
    const pBest = pl.reduce<PrevSet | null>(
      (b, s) => (!b || s.weight_kg > b.weight_kg || (s.weight_kg === b.weight_kg && s.reps > b.reps) ? s : b),
      null,
    );
    const pVol = pl.reduce((a, s) => a + s.weight_kg * s.reps, 0);
    return { id, name: all[0].name, muscle: all[0].muscle, w, warm, best, vol, e1rm, pBest, pVol, hasPrev: pl.length > 0 };
  });

  const byMuscle = new Map<string, number>();
  for (const s of work) byMuscle.set(s.muscle, (byMuscle.get(s.muscle) ?? 0) + 1);
  const muscles = [...byMuscle.entries()].sort((a, b) => b[1] - a[1]);

  const improved = rows.filter((r) => r.best && r.pBest && r.best.weight_kg > r.pBest.weight_kg);
  const same = rows.filter((r) => r.best && r.pBest && r.best.weight_kg === r.pBest.weight_kg);
  const lower = rows.filter((r) => r.best && r.pBest && r.best.weight_kg < r.pBest.weight_kg);

  return (
    <section aria-labelledby="resumen" className="flex flex-col gap-4 rounded-2xl bg-surface p-4">
      <h2 id="resumen" className="font-display text-2xl font-bold">
        Resumen de la sesión
      </h2>

      <p className="text-[15px] leading-relaxed">
        {minutes ? `Entrenaste ${minutes} min` : "Sesión sin terminar"}: {rows.length} ejercicios,{" "}
        <strong>{work.length} series de trabajo</strong>
        {sets.length > work.length ? ` (más ${sets.length - work.length} de calentamiento)` : ""} y {reps} repeticiones,
        con un volumen de <strong>{nf.format(d(volume))} {unit}</strong>
        {prs.length ? `, y rompiste ${prs.length} ${prs.length === 1 ? "récord" : "récords"}` : ""}.
        {avgRir !== null && (
          <>
            {" "}
            Terminaste las series con un RIR promedio de {n1.format(avgRir)}
            {toFailure ? ` y ${toFailure} ${toFailure === 1 ? "serie" : "series"} al fallo (RIR 0)` : ""}.
          </>
        )}
      </p>

      {(improved.length > 0 || same.length > 0 || lower.length > 0) && (
        <div className="text-sm">
          <h3 className="mb-1 font-semibold">Contra tu sesión anterior</h3>
          <ul className="flex flex-col gap-1 text-muted">
            {improved.length > 0 && (
              <li>
                Subiste peso en: <span className="text-text">{improved.map((r) => r.name).join(", ")}</span>
              </li>
            )}
            {same.length > 0 && (
              <li>
                Mismo peso máximo en: <span className="text-text">{same.map((r) => r.name).join(", ")}</span>
              </li>
            )}
            {lower.length > 0 && (
              <li>
                Peso máximo menor en: <span className="text-text">{lower.map((r) => r.name).join(", ")}</span>
              </li>
            )}
          </ul>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold">Por ejercicio</h3>
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl bg-bg p-3 text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-semibold">{r.name}</p>
                <p className="text-xs text-muted">{r.muscle}</p>
              </div>
              <p className="mt-1 text-muted">
                {r.w.length} {r.w.length === 1 ? "serie" : "series"} de trabajo
                {r.warm ? ` + ${r.warm} calentamiento` : ""} · volumen {nf.format(d(r.vol))} {unit}
              </p>
              {r.best && (
                <p className="text-muted">
                  Mejor serie:{" "}
                  <span className="text-text">
                    {n1.format(d(r.best.weight_kg))} {unit} × {r.best.reps}
                  </span>
                  {r.best.rir !== null ? ` (RIR ${r.best.rir})` : ""} · 1RM est. {nf.format(d(r.e1rm))} {unit}
                </p>
              )}
              <p className="text-muted">
                Series:{" "}
                {r.w.map((s, i) => (
                  <span key={i}>
                    {i > 0 ? " · " : ""}
                    {n1.format(d(s.weight_kg))}×{s.reps}
                    {s.rir !== null ? `@${s.rir}` : ""}
                    {s.is_pr ? " ★" : ""}
                  </span>
                ))}
              </p>
              {r.hasPrev && r.best && r.pBest ? (
                <p className="text-muted">
                  Anterior: {n1.format(d(r.pBest.weight_kg))} {unit} × {r.pBest.reps}, volumen {nf.format(d(r.pVol))} {unit}
                  {" → "}
                  <span className="text-text">
                    {sign(r.vol - r.pVol)}
                    {nf.format(Math.abs(d(r.vol - r.pVol)))} {unit} de volumen
                    {r.best.weight_kg !== r.pBest.weight_kg
                      ? `, ${sign(r.best.weight_kg - r.pBest.weight_kg)}${n1.format(Math.abs(d(r.best.weight_kg - r.pBest.weight_kg)))} ${unit} en peso máx.`
                      : ""}
                  </span>
                </p>
              ) : (
                <p className="text-muted">Primera vez que registras este ejercicio.</p>
              )}
            </li>
          ))}
        </ul>
      </div>

      {muscles.length > 0 && (
        <div className="text-sm">
          <h3 className="mb-1 font-semibold">Series por músculo</h3>
          <p className="text-muted">
            {muscles.map(([m, n]) => `${m}: ${n}`).join(" · ")}. Series efectivas (normales con RIR ≤ 4): {effective}.
          </p>
        </div>
      )}

      <p className="text-xs text-muted">
        ★ = récord de peso. 1RM y series efectivas son estimaciones (fórmula de Epley; RIR ≤ 4). El calentamiento no
        cuenta en series ni en volumen.
      </p>
    </section>
  );
}
