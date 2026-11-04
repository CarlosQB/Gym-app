// El peso se guarda siempre en libras (columna weight_kg, nombre histórico).
// La unidad elegida solo cambia cómo se muestra y se captura.
export type Unit = "lb" | "kg";

const LB_PER_KG = 2.20462;
const round2 = (n: number) => Math.round(n * 100) / 100;

export const parseUnit = (v: string | undefined): Unit => (v === "kg" ? "kg" : "lb");
export const toDisplay = (lb: number, unit: Unit) => (unit === "kg" ? round2(lb / LB_PER_KG) : lb);
export const fromDisplay = (v: number, unit: Unit) => (unit === "kg" ? round2(v * LB_PER_KG) : v);
export const stepFor = (unit: Unit) => (unit === "kg" ? 2.5 : 5);
/**
 * Aumento de la recomendación: el disco más chico del gym es de 5 lb, así que con barra, máquina o polea
 * se sube 5 por lado (10 lb en total). Las mancuernas van de una en una, de 5 en 5 lb (se detecta por el nombre).
 */
export const progressStep = (unit: Unit, exerciseName = "") => {
  const n = exerciseName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  // Con mancuerna, o ejercicios que casi siempre se hacen con mancuerna si no dicen polea/máquina.
  const dumbbell =
    /mancuerna/.test(n) ||
    (/laterales|frontales|martillo|concentrado|zottman|kickback|patada/.test(n) && !/polea|cable|maquina|smith/.test(n));
  if (unit === "kg") return dumbbell ? 2.5 : 5;
  return dumbbell ? 5 : 10;
};
export const defaultWeight = (unit: Unit) => (unit === "kg" ? 20 : 45);
