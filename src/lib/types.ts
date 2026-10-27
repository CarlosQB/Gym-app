export type Exercise = {
  id: string;
  name: string;
  muscle_group: string;
  equipment: string | null;
  notes?: string | null;
  image_id?: string | null;
};

export type Routine = {
  id: string;
  name: string;
  weekday: number | null;
  position: number;
};

export type RoutineExercise = {
  id: string;
  routine_id: string;
  exercise_id: string;
  position: number;
  target_sets: number;
  rep_min: number;
  rep_max: number;
  rir_min: number;
  rir_max: number;
  rest_seconds: number;
  with_previous: boolean;
  alt_exercise_id: string | null;
  exercise: Exercise;
  alt_exercise: Exercise | null;
};

export type Workout = {
  id: string;
  routine_id: string | null;
  name: string;
  started_at: string;
  ended_at: string | null;
};

export type SetKind = "warmup" | "normal" | "dropset";

export type SetRow = {
  id: string;
  workout_id: string;
  exercise_id: string;
  set_number: number;
  kind: SetKind;
  weight_kg: number;
  reps: number;
  rir: number | null;
  is_pr: boolean;
  note?: string | null;
  created_at: string;
};

export type LastBest = { weight_kg: number; reps: number; rir: number | null };
export type LastSetRow = { kind: string; weight_kg: number; reps: number; rir: number | null };
