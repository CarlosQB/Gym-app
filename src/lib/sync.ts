// Envía al servidor lo que quedó pendiente en la cola local, en orden.
import { deleteSet, saveSet, syncFinish } from "@/app/actions";
import { addFailed, getQueue, isNetworkError, removeOp, type Op } from "./offline";

let flushing = false;

async function run(op: Op) {
  if (op.op === "save") {
    const res = await saveSet({
      id: op.id,
      workoutId: op.workoutId,
      exerciseId: op.exerciseId,
      kind: op.kind,
      weightKg: op.weightKg,
      reps: op.reps,
      rir: op.rir,
    });
    if (!res.ok) throw new Error(res.error ?? "No se pudo guardar");
  } else if (op.op === "del") {
    await deleteSet(op.id, op.workoutId);
  } else {
    await syncFinish(op.workoutId, op.endedAt);
  }
}

/** Devuelve cuántas operaciones se enviaron. Se detiene si vuelve a fallar la red. */
export async function flushQueue(): Promise<number> {
  if (flushing || typeof navigator === "undefined" || !navigator.onLine) return 0;
  flushing = true;
  let sent = 0;
  try {
    for (;;) {
      const op = getQueue()[0];
      if (!op) break;
      try {
        await run(op);
        removeOp(op.qid);
        sent += 1;
      } catch (e) {
        if (isNetworkError(e)) break;
        // Error del servidor: se aparta para no bloquear lo demás y se avisa.
        removeOp(op.qid);
        addFailed(e instanceof Error ? e.message : "Error al sincronizar");
      }
    }
  } finally {
    flushing = false;
  }
  return sent;
}
