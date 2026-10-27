// Detección de ejercicios que parecen el mismo con otro nombre (estimación: el usuario decide).

export type ExerciseLite = { id: string; name: string; sets: number };

const STOPWORDS = new Set(["de", "del", "en", "con", "la", "el", "a", "y"]);

/** Minúsculas, sin acentos ni espacios dobles ("Jalón " = "jalon"). */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function words(s: string): Set<string> {
  return new Set(norm(s).split(" ").filter((w) => w && !STOPWORDS.has(w)));
}

/** true si un nombre empieza con el otro o comparten casi todas las palabras. */
export function isSimilar(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb || na.startsWith(nb + " ") || nb.startsWith(na + " ")) return true;
  const wa = words(a);
  const wb = words(b);
  if (wa.size === 0 || wb.size === 0) return false;
  let common = 0;
  for (const w of wa) if (wb.has(w)) common++;
  return common / Math.max(wa.size, wb.size) >= 0.75;
}

/** Pares parecidos; el primero se une al segundo (se conserva el que tiene más series). */
export function duplicatePairs<T extends ExerciseLite>(list: T[]): [T, T][] {
  const pairs: [T, T][] = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      if (!isSimilar(list[i].name, list[j].name)) continue;
      pairs.push(list[i].sets >= list[j].sets ? [list[j], list[i]] : [list[i], list[j]]);
    }
  }
  return pairs;
}

// Pares que el usuario dijo que NO son el mismo (se guardan en este teléfono).
const NOT_DUP_KEY = "gym:not-duplicates";
const pairKey = (a: string, b: string) => [a, b].sort().join("|");

export function getNotDuplicates(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(NOT_DUP_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function isMarkedDifferent(set: Set<string>, a: string, b: string) {
  return set.has(pairKey(a, b));
}

export function markNotDuplicate(a: string, b: string) {
  try {
    const all = getNotDuplicates();
    all.add(pairKey(a, b));
    localStorage.setItem(NOT_DUP_KEY, JSON.stringify([...all]));
  } catch {
    // sin almacenamiento: se volverá a preguntar
  }
}
