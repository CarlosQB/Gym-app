"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { fromDisplay, parseUnit } from "@/lib/units";
import type { SetKind } from "@/lib/types";

export async function setUnit(unit: string) {
  (await cookies()).set("unit", parseUnit(unit), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}

export async function seedDefaults() {
  const supabase = await createClient();
  await supabase.rpc("seed_defaults");
  revalidatePath("/");
}

export async function startWorkout(routineId: string) {
  const supabase = await createClient();

  const { data: routine } = await supabase
    .from("routines")
    .select("id, name")
    .eq("id", routineId)
    .single();
  if (!routine) redirect("/");

  // Si hay una sesión abierta de las últimas 12 h para esta rutina, se retoma.
  const since = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
  const { data: open } = await supabase
    .from("workouts")
    .select("id")
    .eq("routine_id", routineId)
    .is("ended_at", null)
    .gte("started_at", since)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (open) redirect(`/entrenar/${open.id}`);

  const { data: created, error } = await supabase
    .from("workouts")
    .insert({ routine_id: routine.id, name: routine.name })
    .select("id")
    .single();
  if (error || !created) redirect("/");

  redirect(`/entrenar/${created.id}`);
}

export type SaveSetInput = {
  /** Id generado en el cliente: permite reintentar sin duplicar la serie. */
  id?: string;
  workoutId: string;
  exerciseId: string;
  kind: SetKind;
  weightKg: number;
  reps: number;
  rir: number | null;
  note?: string | null;
};

export async function saveSet(input: SaveSetInput): Promise<{ ok: boolean; isPr?: boolean; error?: string }> {
  if (
    !Number.isFinite(input.weightKg) ||
    input.weightKg < 0 ||
    !Number.isInteger(input.reps) ||
    input.reps < 0
  ) {
    return { ok: false, error: "Datos inválidos" };
  }

  const supabase = await createClient();

  // Las dos consultas son independientes: se piden a la vez.
  const [{ count }, prevRes] = await Promise.all([
    supabase
      .from("sets")
      .select("id", { count: "exact", head: true })
      .eq("workout_id", input.workoutId)
      .eq("exercise_id", input.exerciseId),
    input.kind === "normal"
      ? supabase
          .from("sets")
          .select("weight_kg")
          .eq("exercise_id", input.exerciseId)
          .eq("kind", "normal")
          .order("weight_kg", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const prev = prevRes.data;
  const isPr = input.kind === "normal" && !!prev && input.weightKg > Number(prev.weight_kg);

  const { error } = await supabase.from("sets").insert({
    id: input.id,
    workout_id: input.workoutId,
    exercise_id: input.exerciseId,
    set_number: (count ?? 0) + 1,
    kind: input.kind,
    weight_kg: input.weightKg,
    reps: input.reps,
    rir: input.rir,
    is_pr: isPr,
    // Solo se envía si hay nota: así guardar sin notas sigue funcionando aunque falte la migración 004.
    ...(input.note?.trim() ? { note: input.note.trim().slice(0, 300) } : {}),
  });
  // 23505 = ya existía (se reintentó una serie que sí llegó): se da por buena.
  if (error && error.code !== "23505") return { ok: false, error: error.message };

  revalidatePath(`/entrenar/${input.workoutId}`);
  return { ok: true, isPr };
}

export async function deleteSet(setId: string, workoutId: string) {
  const supabase = await createClient();
  await supabase.from("sets").delete().eq("id", setId);
  revalidatePath(`/entrenar/${workoutId}`);
}

export type UpdateSetInput = {
  setId: string;
  workoutId: string;
  kind: SetKind;
  weightKg: number;
  reps: number;
  rir: number | null;
  note?: string | null;
};

export async function updateSet(input: UpdateSetInput): Promise<{ ok: boolean; error?: string }> {
  if (
    !Number.isFinite(input.weightKg) ||
    input.weightKg < 0 ||
    !Number.isInteger(input.reps) ||
    input.reps < 0 ||
    (input.rir !== null && (!Number.isInteger(input.rir) || input.rir < 0 || input.rir > 10))
  ) {
    return { ok: false, error: "Datos inválidos" };
  }
  const supabase = await createClient();
  const patch: Record<string, unknown> = {
    kind: input.kind,
    weight_kg: input.weightKg,
    reps: input.reps,
    rir: input.rir,
  };
  if (input.kind !== "normal") patch.is_pr = false;
  if (input.note !== undefined) patch.note = input.note?.trim() ? input.note.trim().slice(0, 300) : null;
  const { error } = await supabase.from("sets").update(patch).eq("id", input.setId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/historial/${input.workoutId}`);
  revalidatePath("/historial");
  return { ok: true };
}

export async function updateExerciseNote(exerciseId: string, note: string) {
  const supabase = await createClient();
  await supabase
    .from("exercises")
    .update({ notes: note.trim() ? note.trim().slice(0, 500) : null })
    .eq("id", exerciseId);
  revalidatePath("/", "layout");
}

function cleanVideoUrl(raw: string): string | null | undefined {
  const v = raw.trim();
  if (!v) return null;
  if (v.length > 300) return undefined;
  try {
    const u = new URL(v);
    return u.protocol === "https:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

export async function updateExercise(input: {
  id: string;
  muscleGroup?: string;
  videoUrl?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const patch: Record<string, unknown> = {};
  if (input.muscleGroup !== undefined) {
    const g = input.muscleGroup.trim();
    if (!g || g.length > 40) return { ok: false, error: "Grupo muscular inválido" };
    patch.muscle_group = g;
  }
  if (input.videoUrl !== undefined) {
    const url = cleanVideoUrl(input.videoUrl);
    if (url === undefined) return { ok: false, error: "El enlace debe empezar con https://" };
    patch.video_url = url;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("exercises").update(patch).eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function addBodyMetric(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const date = String(formData.get("date") ?? "");
  const weightRaw = String(formData.get("weight") ?? "").replace(",", ".").trim();
  const waistRaw = String(formData.get("waist") ?? "").replace(",", ".").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Fecha inválida" };

  const unit = parseUnit((await cookies()).get("unit")?.value);
  const weight = weightRaw ? Number(weightRaw) : null;
  const waist = waistRaw ? Number(waistRaw) : null;
  if (weight === null && waist === null) return { ok: false, error: "Captura el peso o la cintura" };
  if (weight !== null && (!Number.isFinite(weight) || weight <= 0 || weight > 1000)) {
    return { ok: false, error: "Peso inválido" };
  }
  if (waist !== null && (!Number.isFinite(waist) || waist <= 0 || waist > 400)) {
    return { ok: false, error: "Cintura inválida" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("body_metrics").insert({
    measured_on: date,
    // El peso se guarda siempre en libras.
    weight_kg: weight === null ? null : Math.round(fromDisplay(weight, unit) * 100) / 100,
    waist_cm: waist,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/cuerpo");
  return { ok: true };
}

export async function deleteBodyMetric(id: string) {
  const supabase = await createClient();
  await supabase.from("body_metrics").delete().eq("id", id);
  revalidatePath("/cuerpo");
}

export async function deleteWorkout(workoutId: string) {
  const supabase = await createClient();
  // Las series se borran en cascada.
  await supabase.from("workouts").delete().eq("id", workoutId);
  revalidatePath("/");
  revalidatePath("/historial");
  redirect("/historial");
}

export type RoutineItemInput = {
  exerciseId: string | null;
  newName: string;
  muscleGroup: string;
  targetSets: number;
  repMin: number;
  repMax: number;
  rirMin: number;
  rirMax: number;
  restSeconds: number;
  /** true = va en el mismo bloque que el ejercicio anterior */
  withPrevious: boolean;
};

export type RoutineInput = {
  id: string | null;
  name: string;
  weekday: number | null;
  items: RoutineItemInput[];
};

const inRange = (n: number, min: number, max: number) =>
  Number.isInteger(n) && n >= min && n <= max;

export async function saveRoutine(input: RoutineInput): Promise<{ ok: false; error: string }> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Ponle un nombre a la rutina" };
  if (input.weekday !== null && !inRange(input.weekday, 1, 7)) {
    return { ok: false, error: "Día inválido" };
  }
  if (input.items.length === 0) return { ok: false, error: "Agrega al menos un ejercicio" };

  for (const [i, it] of input.items.entries()) {
    const n = i + 1;
    if (!it.exerciseId && !it.newName.trim()) {
      return { ok: false, error: `Ejercicio ${n}: elige uno o escribe el nombre` };
    }
    if (
      !inRange(it.targetSets, 1, 20) ||
      !inRange(it.repMin, 1, 100) ||
      !inRange(it.repMax, 1, 100) ||
      it.repMin > it.repMax ||
      !inRange(it.rirMin, 0, 10) ||
      !inRange(it.rirMax, 0, 10) ||
      it.rirMin > it.rirMax ||
      !inRange(it.restSeconds, 0, 1200)
    ) {
      return { ok: false, error: `Ejercicio ${n}: revisa series, reps, RIR y descanso` };
    }
  }

  const supabase = await createClient();

  // 1. Rutina
  let routineId = input.id;
  if (routineId) {
    const { error } = await supabase
      .from("routines")
      .update({ name, weekday: input.weekday })
      .eq("id", routineId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { count } = await supabase
      .from("routines")
      .select("id", { count: "exact", head: true });
    const { data, error } = await supabase
      .from("routines")
      .insert({ name, weekday: input.weekday, position: count ?? 0 })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: error?.message ?? "No se pudo crear" };
    routineId = data.id;
  }

  // 2. Ejercicios nuevos (si el nombre ya existe se reutiliza)
  async function resolveExercise(
    id: string | null,
    newName: string,
    muscle: string,
  ): Promise<{ id: string } | { error: string }> {
    if (id) return { id };
    const exName = newName.trim();
    const { data: found } = await supabase
      .from("exercises")
      .select("id")
      .eq("name", exName)
      .maybeSingle();
    if (found) return { id: found.id };
    const { data: created, error } = await supabase
      .from("exercises")
      .insert({ name: exName, muscle_group: muscle || "Otro" })
      .select("id")
      .single();
    if (error || !created) return { error: error?.message ?? "No se pudo crear el ejercicio" };
    return { id: created.id };
  }

  const exerciseIds: string[] = [];
  for (const it of input.items) {
    const main = await resolveExercise(it.exerciseId, it.newName, it.muscleGroup);
    if ("error" in main) return { ok: false, error: main.error };
    exerciseIds.push(main.id);
  }

  // 3. Se insertan las filas nuevas y después se borran las anteriores (no se pierde nada si falla).
  const { data: old } = await supabase
    .from("routine_exercises")
    .select("id")
    .eq("routine_id", routineId);

  const { error: insErr } = await supabase.from("routine_exercises").insert(
    input.items.map((it, i) => ({
      routine_id: routineId,
      exercise_id: exerciseIds[i],
      position: i,
      target_sets: it.targetSets,
      rep_min: it.repMin,
      rep_max: it.repMax,
      rir_min: it.rirMin,
      rir_max: it.rirMax,
      rest_seconds: it.restSeconds,
      with_previous: i > 0 && it.withPrevious,
    })),
  );
  if (insErr) return { ok: false, error: insErr.message };

  const oldIds = (old ?? []).map((r) => r.id);
  if (oldIds.length > 0) {
    await supabase.from("routine_exercises").delete().in("id", oldIds);
  }

  revalidatePath("/", "layout");
  redirect("/rutinas");
}

export async function deleteRoutine(routineId: string) {
  const supabase = await createClient();
  // Las sesiones ya guardadas se conservan (routine_id pasa a null).
  await supabase.from("routines").delete().eq("id", routineId);
  revalidatePath("/", "layout");
  redirect("/rutinas");
}

export async function finishWorkout(workoutId: string) {
  const supabase = await createClient();
  await supabase
    .from("workouts")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", workoutId);
  revalidatePath("/");
  redirect("/");
}

// Igual que finishWorkout pero sin redirigir: lo usa la sincronización en segundo plano.
export async function syncFinish(workoutId: string, endedAt: string) {
  const supabase = await createClient();
  const when = new Date(endedAt);
  await supabase
    .from("workouts")
    .update({ ended_at: Number.isNaN(when.getTime()) ? new Date().toISOString() : when.toISOString() })
    .eq("id", workoutId)
    .is("ended_at", null);
  revalidatePath("/", "layout");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
