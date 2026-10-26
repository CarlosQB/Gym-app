"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SetKind } from "@/lib/types";

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
  workoutId: string;
  exerciseId: string;
  kind: SetKind;
  weightKg: number;
  reps: number;
  rir: number | null;
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

  const { count } = await supabase
    .from("sets")
    .select("id", { count: "exact", head: true })
    .eq("workout_id", input.workoutId)
    .eq("exercise_id", input.exerciseId);

  let isPr = false;
  if (input.kind === "normal") {
    const { data: prev } = await supabase
      .from("sets")
      .select("weight_kg")
      .eq("exercise_id", input.exerciseId)
      .eq("kind", "normal")
      .order("weight_kg", { ascending: false })
      .limit(1)
      .maybeSingle();
    isPr = !!prev && input.weightKg > Number(prev.weight_kg);
  }

  const { error } = await supabase.from("sets").insert({
    workout_id: input.workoutId,
    exercise_id: input.exerciseId,
    set_number: (count ?? 0) + 1,
    kind: input.kind,
    weight_kg: input.weightKg,
    reps: input.reps,
    rir: input.rir,
    is_pr: isPr,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/entrenar/${input.workoutId}`);
  return { ok: true, isPr };
}

export async function deleteSet(setId: string, workoutId: string) {
  const supabase = await createClient();
  await supabase.from("sets").delete().eq("id", setId);
  revalidatePath(`/entrenar/${workoutId}`);
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

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
