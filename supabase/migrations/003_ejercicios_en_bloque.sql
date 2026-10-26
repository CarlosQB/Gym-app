-- Cada ejercicio es una fila propia (con sus series, reps, RIR y descanso).
-- with_previous = true: se hace en el mismo bloque que el ejercicio anterior, uno después del otro.
alter table public.routine_exercises
  add column if not exists with_previous boolean not null default false;

-- Convierte los "alternos" de la migración 002 en filas propias que van después de su principal.
update public.routine_exercises set position = position * 2;

insert into public.routine_exercises
  (user_id, routine_id, exercise_id, position, target_sets, rep_min, rep_max, rir_min, rir_max, rest_seconds, with_previous)
select user_id, routine_id, alt_exercise_id, position + 1, target_sets, rep_min, rep_max, rir_min, rir_max, rest_seconds, true
from public.routine_exercises
where alt_exercise_id is not null;

update public.routine_exercises set alt_exercise_id = null, alternate = false where alt_exercise_id is not null;
