-- Imagen de técnica en 2 pasos: id del ejercicio en el catálogo libre free-exercise-db.
alter table public.exercises add column if not exists image_id text;
