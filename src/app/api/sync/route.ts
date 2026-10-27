import { deleteSet, saveSet, syncFinish } from "@/app/actions";
import type { Op } from "@/lib/offline";

// Recibe una operación de la cola local del teléfono (ver src/lib/sync.ts).
// Las reglas RLS de Supabase siguen limitando todo a las filas del usuario.
export async function POST(request: Request) {
  let op: Op;
  try {
    op = (await request.json()) as Op;
  } catch {
    return Response.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
  }

  if (op?.op === "save") {
    const res = await saveSet({
      id: op.id,
      workoutId: op.workoutId,
      exerciseId: op.exerciseId,
      kind: op.kind === "warmup" || op.kind === "dropset" ? op.kind : "normal",
      weightKg: Number(op.weightKg),
      reps: Number(op.reps),
      rir: op.rir === null ? null : Number(op.rir),
      note: op.note,
    });
    return Response.json(res);
  }
  if (op?.op === "del") {
    await deleteSet(op.id, op.workoutId);
    return Response.json({ ok: true });
  }
  if (op?.op === "finish") {
    await syncFinish(op.workoutId, op.endedAt);
    return Response.json({ ok: true });
  }
  return Response.json({ ok: false, error: "Operación desconocida" }, { status: 400 });
}
