// Consejos para la próxima vez (estimación), a partir de cómo salieron las series y el objetivo de la rutina.

export type CoachSet = { kind: string; weight: number; reps: number; rir: number | null };
export type CoachTarget = { repMin: number; repMax: number; rirMin: number; rirMax: number; restSeconds: number };

export function coachTips(sets: CoachSet[], t: CoachTarget, max = 3): string[] {
  const w = sets.filter((s) => s.kind === "normal");
  if (w.length === 0) return [];
  const hasDrop = sets.some((s) => s.kind === "dropset");
  const tips: string[] = [];
  const first = w[0];
  const last = w[w.length - 1];

  if (first.reps > t.repMax) tips.push(`Tu 1ª serie pasó el rango (${first.reps} reps de máx. ${t.repMax}): toca subir peso.`);

  if (w.some((s, i) => i > 0 && s.weight < w[i - 1].weight))
    tips.push("Bajaste peso a media rutina: usa un solo peso en todas las series para medir mejor tu avance.");

  if (t.rirMin >= 1 && w.slice(0, -1).some((s) => s.rir === 0))
    tips.push(`Llegaste al fallo antes de la última serie y el objetivo era RIR ${t.rirMin}–${t.rirMax}: guarda 1–2 reps.`);

  const sameWeight = w.every((s) => s.weight === first.weight);
  const drop = first.reps - last.reps;
  if (sameWeight && drop >= 3) {
    tips.push(
      t.restSeconds < 90
        ? `Pierdes ${drop} reps entre la 1ª y la última serie: descansa ${t.restSeconds + 30} s.`
        : `Pierdes ${drop} reps entre la 1ª y la última serie: deja RIR 1 en las primeras.`,
    );
  }

  if (w.some((s) => s.reps < t.repMin))
    tips.push(`Quedaste abajo del rango (mín. ${t.repMin} reps): baja un poco el peso o descansa más.`);

  if (w.length >= 2 && w.every((s) => s.rir === 0) && !hasDrop)
    tips.push("Todas al fallo: prueba RIR 1 en las primeras y un dropset solo en la última.");

  return tips.slice(0, max);
}

