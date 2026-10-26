-- Enlace de video de técnica por ejercicio y cintura en las medidas corporales.
alter table public.exercises add column if not exists video_url text;
alter table public.body_metrics add column if not exists waist_cm numeric(5,1);
