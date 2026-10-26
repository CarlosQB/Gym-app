-- Nota opcional por serie (ej. "banco en la muesca 4", "me molestó el hombro").
-- Las notas por ejercicio usan la columna exercises.notes, que ya existía.
alter table public.sets add column if not exists note text;
