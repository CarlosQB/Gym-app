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
