// Consejos para la próxima vez (estimación), según el tipo de ejercicio, cómo salieron las series y el objetivo.
import { norm } from "@/lib/similar";

export type CoachSet = { kind: string; weight: number; reps: number; rir: number | null };
export type CoachTarget = { repMin: number; repMax: number; rirMin: number; rirMax: number; restSeconds: number };
export type ExerciseType = "compuesto" | "aislado";
export type Tip = { title: string; why: string };

// Multiarticulares: varias articulaciones y mucho peso; la fatiga de una serie se arrastra a las siguientes.
const COMPOUND = [
  "press banca",
  "press de banca",
  "press inclinado",
  "press declinado",
  "press militar",
  "press de hombro",
  "press hombro",
  "press arnold",
  "press pecho",
  "press de pecho",
  "sentadilla",
  "peso muerto",
  "remo",
  "dominada",
  "jalon",
  "fondos",
  "hip thrust",
  "prensa",
  "zancada",
  "desplante",
  "bulgara",
  "hack",
  "empuje",
];
// Monoarticulares: una articulación, poco peso; aguantan bien el fallo y piden volumen.
const ISOLATION = [
  "curl",
  "extension",
  "elevacion",
  "elevaciones",
  "apertura",
  "aperturas",
  "pec deck",
  "patada",
  "femoral",
  "pantorrilla",
  "gemelo",
  "face pull",
  "encogimiento",
  "pullover",
  "cruce",
  "frances",
  "copa",
  "abduccion",
  "aduccion",
  "crunch",
  "abdominal",
];

/** Compuesto o aislado según el nombre; si no se reconoce, el primero de la rutina cuenta como principal. */
export function exerciseType(name: string, position?: number): ExerciseType {
  const n = norm(name);
  if (ISOLATION.some((k) => n.includes(k))) return "aislado";
  if (COMPOUND.some((k) => n.includes(k))) return "compuesto";
  return position === 0 ? "compuesto" : "aislado";
}

export function coachTips(sets: CoachSet[], t: CoachTarget, type: ExerciseType, max = 3): Tip[] {
  const w = sets.filter((s) => s.kind === "normal");
  if (w.length === 0) return [];
  const hasDrop = sets.some((s) => s.kind === "dropset");
  const tips: Tip[] = [];
  const first = w[0];
  const last = w[w.length - 1];
  const sameWeight = w.every((s) => s.weight === first.weight);
  const repLoss = first.reps - last.reps;
  const loweredAt = w.findIndex((s, i) => i > 0 && s.weight < w[i - 1].weight);
  const failedAt = w.findIndex((s, i) => i < w.length - 1 && s.rir === 0);

  if (first.reps > t.repMax) {
    tips.push({
      title: `Sube el peso: la 1ª serie llegó a ${first.reps} reps (tope ${t.repMax}).`,
      why:
        type === "compuesto"
          ? "Si pasas el rango con margen, el peso ya no te exige lo suficiente para seguir ganando fuerza."
          : "En aislados puedes subir peso o quedarte y sumar una serie; si el músculo no lo sientes, sube peso.",
    });
  }

  if (type === "compuesto") {
    if (failedAt >= 0 && t.rirMin >= 1) {
      tips.push({
        title: `Fallo en la serie ${failedAt + 1}: deja ${t.rirMin}–${t.rirMax} reps en reserva.`,
        why:
          "En un compuesto el fallo temprano cansa mucho al sistema nervioso y te quita reps (o peso) en las series siguientes y en el resto de la rutina.",
      });
    } else if (failedAt >= 0 && t.rirMin === 0) {
      tips.push({
        title: "Considera RIR 1–2 en este ejercicio.",
        why: "Es un compuesto: ir al fallo en todas las series suele dar la misma ganancia con mucha más fatiga y riesgo de mala técnica.",
      });
    }
    if (loweredAt > 0) {
      tips.push({
        title: `Bajaste peso en la serie ${loweredAt + 1}: intenta mantener uno solo.`,
        why: "Con el mismo peso en todas las series, el plan puede medir si progresas. Si no llegas, mejor menos reps que menos peso.",
      });
    }
    if (sameWeight && repLoss >= 2 && t.restSeconds < 150) {
      tips.push({
        title: `Descansa más: ${t.restSeconds} s → ${Math.max(150, t.restSeconds + 60)} s.`,
        why: `Perdiste ${repLoss} reps de la 1ª a la última serie. En compuestos 2.5–3 min de descanso recuperan casi toda la fuerza.`,
      });
    }
    if (w.some((s) => s.reps < t.repMin)) {
      tips.push({
        title: `Quedaste abajo de ${t.repMin} reps: baja un escalón de peso.`,
        why: "Fuera del rango el plan no puede subir de forma ordenada; vuelve a entrar al rango y sube desde ahí.",
      });
    }
  } else {
    // Aislados: el fallo está bien; lo que cuenta es el volumen y la calidad de las reps.
    if (sameWeight && repLoss >= 4) {
      tips.push({
        title: `Pierdes ${repLoss} reps entre series: prueba ${Math.max(75, t.restSeconds + 30)} s de descanso.`,
        why: "Ir al fallo en aislados está bien, pero si la caída es tan grande sumas menos reps totales, que es lo que hace crecer el músculo.",
      });
    }
    if (w.length >= 2 && w.every((s) => s.rir === 0) && !hasDrop && repLoss <= 3) {
      tips.push({
        title: "Agrega un dropset en la última serie.",
        why: "Ya vas al fallo; un dropset te da reps extra cerca del fallo sin añadir otra serie ni más tiempo.",
      });
    }
    if (hasDrop && w.length >= 2 && repLoss <= 1 && first.reps <= t.repMax) {
      tips.push({
        title: "Vas bien: buena serie y dropset.",
        why: "Mantienes las reps entre series. Cuando la 1ª pase el tope del rango, sube peso.",
      });
    }
    if (w.some((s) => s.reps < t.repMin)) {
      tips.push({
        title: `Quedaste abajo de ${t.repMin} reps: baja un poco el peso.`,
        why: "En aislados rinden más las reps controladas en el rango que mover más peso con mala técnica.",
      });
    }
    if (loweredAt > 0 && !hasDrop) {
      tips.push({
        title: "Si bajas peso entre series, anótalo como dropset.",
        why: "Así no cuenta como serie del objetivo y el plan compara bien contra la vez pasada.",
      });
    }
  }

  if (tips.length === 0 && w.every((s) => s.reps >= t.repMin && s.reps <= t.repMax)) {
    tips.push({
      title: "Vas en rango: repite el plan y busca una rep más.",
      why: `Cuando la 1ª serie llegue a ${t.repMax} reps, la app te sube el peso sola.`,
    });
  }

  return tips.slice(0, max);
}
