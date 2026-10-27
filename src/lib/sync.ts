// Envía la cola local al servidor, en orden, por /api/sync.
// Se usa una ruta fija (no Server Actions) porque su dirección no cambia entre deploys:
// una pantalla abierta desde antes de un deploy puede seguir sincronizando.
import { addFailed, getQueue, markLocalPr, removeLocalSets, removeOp, setNeedsLogin, type Op } from "./offline";

export const SAVED_EVENT = "gym:set-saved";
export const FAILED_EVENT = "gym:op-failed";
const TIMEOUT_MS = 10000;

type Result = { ok: boolean; isPr?: boolean; error?: string };

class NetworkError extends Error {}
class AuthError extends Error {}

async function send(op: Op): Promise<Result> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(op),
      signal: controller.signal,
    });
  } catch {
    // Sin señal o la red tardó demasiado: se reintenta después (el id evita duplicados).
    throw new NetworkError();
  } finally {
    clearTimeout(timer);
  }
  // Sin sesión, el proxy redirige a /login.
  if (res.redirected || res.status === 401) throw new AuthError();
  if (res.status >= 500) throw new NetworkError();
  try {
    return (await res.json()) as Result;
  } catch {
    throw new NetworkError();
  }
}

let flushing = false;

/** Devuelve cuántas operaciones se enviaron. Se detiene si falla la red o falta iniciar sesión. */
export async function flushQueue(): Promise<number> {
  if (flushing || typeof navigator === "undefined" || !navigator.onLine) return 0;
  flushing = true;
  let sent = 0;
  try {
    for (;;) {
      const op = getQueue()[0];
      if (!op) break;
      let res: Result;
      try {
        res = await send(op);
      } catch (e) {
        if (e instanceof AuthError) setNeedsLogin(true);
        break;
      }
      setNeedsLogin(false);
      removeOp(op.qid);
      sent += 1;
      if (res.ok) {
        if (op.op === "save") {
          if (res.isPr) markLocalPr(op.id);
          window.dispatchEvent(new CustomEvent(SAVED_EVENT, { detail: { id: op.id, isPr: !!res.isPr } }));
        }
      } else {
        // Error del servidor: se aparta para no bloquear lo demás y se avisa.
        if (op.op === "save") removeLocalSets([op.id]);
        addFailed(res.error ?? "Error al sincronizar");
        window.dispatchEvent(new CustomEvent(FAILED_EVENT, { detail: { op: op.op, error: res.error } }));
      }
    }
  } finally {
    flushing = false;
  }
  return sent;
}
