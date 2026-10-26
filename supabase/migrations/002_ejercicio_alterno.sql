-- Ejercicio alterno por ejercicio de rutina.
-- alt_exercise_id: el ejercicio con el que se puede intercambiar.
-- alternate: si es true, la app alterna entre uno y otro en cada sesión.
alter table public.routine_exercises
  add column if not exists alt_exercise_id uuid references public.exercises(id) on delete set null,
  add column if not exists alternate boolean not null default false;
