import { toDisplay, type Unit } from "@/lib/units";

export type SummarySet = {
  kind: string;
  weight_kg: number;
  reps: number;
  rir: number | null;
  is_pr: boolean;
  muscle: string;
};

const nf = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

export function WorkoutSummary({
  sets,
  minutes,
  unit,
  exercises,
}: {
  sets: SummarySet[];
  minutes: number | null;
  unit: Unit;
  exercises: number;
}) {
  const work = sets.filter((s) => s.kind !== "warmup");
  const effective = work.filter((s) => s.kind === "normal" && s.rir !== null && s.rir <= 4).length; // estimación
  const volumeLb = work.reduce((a, s) => a + s.weight_kg * s.reps, 0);
  const reps = work.reduce((a, s) => a + s.reps, 0);
  const prs = work.filter((s) => s.is_pr).length;

  const byMuscle = new Map<string, number>();
  for (const s of work) byMuscle.set(s.muscle, (byMuscle.get(s.muscle) ?? 0) + 1);
  const muscles = [...byMuscle.entries()].sort((a, b) => b[1] - a[1]);

  const stats: [string, string][] = [
    ["Duración", minutes ? `${minutes} min` : "—"],
    ["Ejercicios", String(exercises)],
    ["Series de trabajo", String(work.length)],
    ["Series efectivas*", String(effective)],
    ["Repeticiones", String(reps)],
    [`Volumen (${unit})`, nf.format(toDisplay(volumeLb, unit))],
    ["Récords (PR)", String(prs)],
  ];

  return (
    <section aria-labelledby="resumen" className="rounded-2xl bg-surface p-4">
      <h2 id="resumen" className="mb-3 font-display text-2xl font-bold">
        Resumen
      </h2>
      <dl className="grid grid-cols-2 gap-3">
        {stats.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-muted">{k}</dt>
            <dd className="font-display text-2xl font-bold leading-tight">{v}</dd>
          </div>
        ))}
      </dl>
      {muscles.length > 0 && (
        <p className="mt-3 text-sm text-muted">
          Por músculo: {muscles.map(([m, n]) => `${m} ${n}`).join(" · ")}
        </p>
      )}
      <p className="mt-2 text-xs text-muted">
        *Estimación: series normales con RIR 4 o menos. El calentamiento no cuenta. Volumen = peso × repeticiones.
      </p>
    </section>
  );
}
