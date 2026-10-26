// El peso se guarda siempre en libras (columna weight_kg, nombre histórico).
// La unidad elegida solo cambia cómo se muestra y se captura.
export type Unit = "lb" | "kg";

const LB_PER_KG = 2.20462;
const round2 = (n: number) => Math.round(n * 100) / 100;

export const parseUnit = (v: string | undefined): Unit => (v === "kg" ? "kg" : "lb");
export const toDisplay = (lb: number, unit: Unit) => (unit === "kg" ? round2(lb / LB_PER_KG) : lb);
export const fromDisplay = (v: number, unit: Unit) => (unit === "kg" ? round2(v * LB_PER_KG) : v);
export const stepFor = (unit: Unit) => (unit === "kg" ? 2.5 : 5);
export const defaultWeight = (unit: Unit) => (unit === "kg" ? 20 : 45);
