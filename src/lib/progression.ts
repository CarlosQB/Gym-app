// Sugerencia de progresión (estimación): compara tu última sesión con el rango objetivo de la rutina.
export type Suggestion = { weight: number; reps: number; text: string };

const round2 = (n: number) => Math.round(n * 100) / 100;

export function suggest(opts: {
  last: { weight: number; reps: number; rir: number | null } | undefined;
  repMin: number;
  repMax: number;
  rirMax: number;
  step: number;
}): Suggestion | null {
  const { last, repMin, repMax, rirMax, step } = opts;
  if (!last) return null;

  const hitTop = last.reps >= repMax;
  const tooEasy = last.rir !== null && last.rir > rirMax + 1 && last.reps >= repMin;
  if (hitTop || tooEasy) {
    return {
      weight: round2(last.weight + step),
      reps: repMin,
      text: "Llegaste al tope del rango: sube el peso",
    };
  }
  return {
    weight: last.weight,
    reps: Math.min(repMax, last.reps + 1),
    text: "Mismo peso, una rep más",
  };
}

// Plan serie por serie (estimación): calentamientos y series de trabajo según la vez pasada.
export type PlanStep = { kind: "warmup" | "normal"; weight: number; reps: number; generated?: boolean };
export type LastSet = { kind: string; weight: number; reps: number; rir: number | null };

const roundTo = (n: number, step: number) => Math.max(step, Math.round(n / step) * step);

export function planFor(opts: {
  lastSets: LastSet[];
  targetSets: number;
  repMin: number;
  repMax: number;
  rirMax: number;
  step: number;
}): PlanStep[] {
  const { lastSets, targetSets, repMin, repMax, rirMax, step } = opts;
  const lastWork = lastSets.filter((s) => s.kind !== "warmup");
  if (lastWork.length === 0) return [];

  // Se decide con la primera serie de trabajo: si llegó al tope del rango (o sobró RIR), todas suben de peso;
  // si no, mismo peso y una rep más en cada serie. Se ajusta al número de series de la rutina.
  const first = suggest({ last: lastWork[0], repMin, repMax, rirMax, step })!;
  const goesUp = first.weight > lastWork[0].weight;
  const work: PlanStep[] = [];
  for (let i = 0; i < targetSets; i++) {
    const s = lastWork[Math.min(i, lastWork.length - 1)];
    work.push(
      goesUp
        ? { kind: "normal", weight: first.weight, reps: repMin }
        : { kind: "normal", weight: s.weight, reps: Math.min(repMax, s.reps + 1) },
    );
  }

  // Calentamientos: los mismos de la vez pasada; si no hubo, 50% × 10 y 75% × 5 del primer peso.
  const lastWarm = lastSets.filter((s) => s.kind === "warmup");
  const top = work[0].weight;
  const warm: PlanStep[] =
    lastWarm.length > 0
      ? lastWarm.map((s) => ({ kind: "warmup", weight: Math.min(s.weight, top), reps: s.reps }))
      : top >= step * 4
        ? [
            { kind: "warmup", weight: roundTo(top * 0.5, step), reps: 10, generated: true },
            { kind: "warmup", weight: roundTo(top * 0.75, step), reps: 5, generated: true },
          ]
        : [];

  return [...warm, ...work];
}
