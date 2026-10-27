// Imágenes de técnica en 2 pasos (inicio y final) del catálogo libre free-exercise-db (dominio público).
import { norm } from "@/lib/similar";

export type CatalogItem = { id: string; n: string; m: string; e: string };

const IMG_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

/** URLs de las 2 fotos: posición inicial y final. */
export const techniqueImages = (imageId: string) => [`${IMG_BASE}${imageId}/0.jpg`, `${IMG_BASE}${imageId}/1.jpg`];

let catalog: Promise<CatalogItem[]> | null = null;
export function loadCatalog(): Promise<CatalogItem[]> {
  catalog ??= fetch("/catalogo-ejercicios.json")
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .catch((e) => {
      catalog = null;
      throw e;
    });
  return catalog;
}

// El catálogo está en inglés: cada palabra en español se busca por su equivalente.
const ES_EN: Record<string, string[]> = {
  press: ["press"],
  banca: ["bench"],
  inclinado: ["incline"],
  inclinada: ["incline"],
  declinado: ["decline"],
  declinada: ["decline"],
  mancuerna: ["dumbbell"],
  mancuernas: ["dumbbell"],
  barra: ["barbell"],
  polea: ["cable"],
  poleas: ["cable"],
  maquina: ["machine"],
  jalon: ["pulldown"],
  remo: ["row"],
  sentadilla: ["squat"],
  sentadillas: ["squat"],
  prensa: ["leg press"],
  muerto: ["deadlift"],
  rumano: ["romanian"],
  plano: ["flat", "medium grip"],
  plana: ["flat", "medium grip"],
  militar: ["military"],
  hombro: ["shoulder"],
  hombros: ["shoulder"],
  elevacion: ["raise"],
  elevaciones: ["raise"],
  lateral: ["lateral"],
  laterales: ["lateral"],
  frontal: ["front"],
  frontales: ["front"],
  fondos: ["dip"],
  dominada: ["pullup", "chinup"],
  dominadas: ["pullup", "chinup"],
  curl: ["curl"],
  biceps: ["biceps", "curl"],
  triceps: ["triceps"],
  extension: ["extension"],
  extensiones: ["extension"],
  pierna: ["leg"],
  piernas: ["leg"],
  femoral: ["hamstrings", "leg curl"],
  femorales: ["hamstrings", "leg curl"],
  cuadriceps: ["quadriceps"],
  gluteo: ["glute"],
  gluteos: ["glute"],
  pantorrilla: ["calf"],
  pantorrillas: ["calf"],
  abdominal: ["abdominals", "crunch"],
  abdominales: ["abdominals", "crunch"],
  apertura: ["fly", "flye", "butterfly"],
  aperturas: ["fly", "flye", "butterfly"],
  pecho: ["chest"],
  espalda: ["back"],
  cerrado: ["close"],
  cerrada: ["close"],
  abierto: ["wide"],
  abierta: ["wide"],
  agarre: ["grip"],
  martillo: ["hammer"],
  predicador: ["preacher"],
  encogimiento: ["shrug"],
  encogimientos: ["shrug"],
  zancada: ["lunge"],
  zancadas: ["lunge"],
  desplante: ["lunge"],
  desplantes: ["lunge"],
  patada: ["kickback"],
  patadas: ["kickback"],
  cuerda: ["rope"],
  cruce: ["crossover"],
  sentado: ["seated"],
  sentada: ["seated"],
  parado: ["standing"],
  unilateral: ["one arm"],
  hip: ["hip"],
  thrust: ["thrust"],
};
const STOP = new Set(["de", "del", "en", "con", "la", "el", "a", "al", "y", "peso", "pie"]);

const compact = (s: string) => norm(s).replace(/[^a-z0-9]/g, "");

/** Busca en el catálogo con palabras en español o inglés; los que más palabras coinciden van primero. */
export function searchCatalog(list: CatalogItem[], query: string, limit = 20): CatalogItem[] {
  const groups = norm(query)
    .split(" ")
    .filter((w) => w && !STOP.has(w))
    .map((w) => [w, ...(ES_EN[w] ?? [])].map(compact));
  if (groups.length === 0) return [];
  return list
    .map((it) => {
      const hay = compact(`${it.n} ${it.m} ${it.e}`);
      const name = compact(it.n);
      // Una palabra cuenta doble si aparece en el nombre y no solo en músculo o equipo.
      const score = groups.reduce(
        (a, g) => a + (g.some((t) => name.includes(t)) ? 2 : g.some((t) => hay.includes(t)) ? 1 : 0),
        0,
      );
      return { it, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.it.n.length - b.it.n.length)
    .slice(0, limit)
    .map((x) => x.it);
}
