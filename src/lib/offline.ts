// Cola local (localStorage) para seguir entrenando sin señal.
// Las series se guardan primero en el teléfono y se envían al servidor en orden (ver src/lib/sync.ts).
import type { SetKind, SetRow } from "./types";

export type SaveOp = {
  op: "save";
  qid: string;
  id: string;
  workoutId: string;
  exerciseId: string;
  kind: SetKind;
  weightKg: number;
  reps: number;
  rir: number | null;
  note: string | null;
};
export type DelOp = { op: "del"; qid: string; id: string; workoutId: string };
export type FinishOp = { op: "finish"; qid: string; workoutId: string; endedAt: string };
export type Op = SaveOp | DelOp | FinishOp;
export type NewOp = Omit<SaveOp, "qid"> | Omit<DelOp, "qid"> | Omit<FinishOp, "qid">;

export const QUEUE_KEY = "gym:queue";
export const LOCAL_KEY = "gym:local";
export const DELETED_KEY = "gym:deleted";
export const FAILED_KEY = "gym:failed";
export const AUTH_KEY = "gym:needs-login";
export const CHANGE_EVENT = "gym:storage-changed";
const KEYS = [QUEUE_KEY, LOCAL_KEY, DELETED_KEY, FAILED_KEY, AUTH_KEY];

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // almacenamiento lleno o bloqueado: la app sigue funcionando en línea
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Para useSyncExternalStore: se vuelve a leer cuando cambia algo local. */
export function subscribeStorage(cb: () => void) {
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function snapshotStorage(): string {
  try {
    return KEYS.map((k) => localStorage.getItem(k) ?? "").join("|");
  } catch {
    return "";
  }
}

export const getQueue = () => read<Op[]>(QUEUE_KEY, []);
export const getFailed = () => read<string[]>(FAILED_KEY, []);
export const getDeleted = () => read<string[]>(DELETED_KEY, []);
export const needsLogin = () => read<boolean>(AUTH_KEY, false);
export const getLocalSets = (workoutId: string) =>
  read<SetRow[]>(LOCAL_KEY, []).filter((s) => s.workout_id === workoutId);

export function enqueue(op: NewOp) {
  const full = { ...op, qid: crypto.randomUUID() } as Op;
  write(QUEUE_KEY, [...getQueue(), full]);
}

export function removeOp(qid: string) {
  write(
    QUEUE_KEY,
    getQueue().filter((o) => o.qid !== qid),
  );
}

/** Si la serie aún no se envió, se quita de la cola y devuelve true. */
export function dropQueuedSave(id: string): boolean {
  const q = getQueue();
  const next = q.filter((o) => !(o.op === "save" && o.id === id));
  if (next.length === q.length) return false;
  write(QUEUE_KEY, next);
  return true;
}

export function addLocalSet(row: SetRow) {
  const all = read<SetRow[]>(LOCAL_KEY, []);
  write(LOCAL_KEY, [...all.filter((s) => s.id !== row.id), row].slice(-300));
}

export function markLocalPr(id: string) {
  const all = read<SetRow[]>(LOCAL_KEY, []);
  if (all.some((s) => s.id === id)) write(LOCAL_KEY, all.map((s) => (s.id === id ? { ...s, is_pr: true } : s)));
}

export function removeLocalSets(ids: string[]) {
  if (ids.length === 0) return;
  const all = read<SetRow[]>(LOCAL_KEY, []);
  const next = all.filter((s) => !ids.includes(s.id));
  if (next.length !== all.length) write(LOCAL_KEY, next);
}

export function markDeleted(id: string) {
  write(DELETED_KEY, [...getDeleted().filter((x) => x !== id), id].slice(-200));
}

export function addFailed(message: string) {
  write(FAILED_KEY, [...getFailed(), message].slice(-20));
}

export function clearFailed() {
  write(FAILED_KEY, []);
}

export function setNeedsLogin(value: boolean) {
  if (needsLogin() !== value) write(AUTH_KEY, value);
}

/** Borra todo lo local (al cerrar sesión). */
export function clearAllLocal() {
  try {
    KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {
    // nada
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
