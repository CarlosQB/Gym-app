-- Esquema de la app de gym (un solo usuario, pero con RLS por seguridad).
-- Pégalo completo en Supabase → SQL Editor → Run.

create extension if not exists "pgcrypto";

-- ───────── Tablas ─────────

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  muscle_group text not null,
  equipment text,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  -- 1 = lunes ... 7 = domingo; null = sin día fijo
  weekday smallint check (weekday between 1 and 7),
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  routine_id uuid not null references public.routines(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  position smallint not null default 0,
  target_sets smallint not null default 3,
  rep_min smallint not null default 8,
  rep_max smallint not null default 12,
  rir_min smallint not null default 1,
  rir_max smallint not null default 2,
  rest_seconds smallint not null default 120
);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  routine_id uuid references public.routines(id) on delete set null,
  name text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text
);

create table if not exists public.sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  set_number smallint not null,
  kind text not null default 'normal' check (kind in ('warmup', 'normal', 'dropset')),
  weight_kg numeric(6,2) not null check (weight_kg >= 0),
  reps smallint not null check (reps >= 0),
  rir smallint check (rir between 0 and 10),
  is_pr boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  measured_on date not null default current_date,
  weight_kg numeric(5,2),
  notes text
);

create index if not exists sets_exercise_idx on public.sets (user_id, exercise_id, created_at desc);
create index if not exists sets_workout_idx on public.sets (workout_id);
create index if not exists workouts_started_idx on public.workouts (user_id, started_at desc);
create index if not exists routine_exercises_routine_idx on public.routine_exercises (routine_id, position);

-- ───────── Row Level Security: cada fila es solo de su dueño ─────────

alter table public.exercises enable row level security;
alter table public.routines enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.sets enable row level security;
alter table public.body_metrics enable row level security;

do $$
declare t text;
begin
  foreach t in array array['exercises','routines','routine_exercises','workouts','sets','body_metrics']
  loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- ───────── Vista: series efectivas por grupo muscular y semana ─────────
-- "Efectiva" = serie normal con RIR <= 4 (estimación: ajusta el criterio a tu gusto).

create or replace view public.weekly_muscle_sets
with (security_invoker = true) as
select
  s.user_id,
  date_trunc('week', w.started_at)::date as week_start,
  e.muscle_group,
  count(*)::int as effective_sets
from public.sets s
join public.workouts w on w.id = s.workout_id
join public.exercises e on e.id = s.exercise_id
where s.kind = 'normal' and (s.rir is null or s.rir <= 4)
group by s.user_id, date_trunc('week', w.started_at)::date, e.muscle_group;

-- ───────── Datos de ejemplo: llama a seed_defaults() desde la app ─────────

create or replace function public.seed_defaults()
returns void
language plpgsql
security invoker
as $$
declare
  uid uuid := auth.uid();
  r_id uuid;
begin
  if uid is null then
    raise exception 'No hay sesión';
  end if;

  if exists (select 1 from public.routines where user_id = uid) then
    return; -- ya hay rutinas, no duplicar
  end if;

  insert into public.exercises (user_id, name, muscle_group, equipment) values
    (uid, 'Press de banca inclinado', 'Pecho', 'Barra'),
    (uid, 'Press militar con mancuernas', 'Hombros', 'Mancuernas'),
    (uid, 'Aperturas en polea', 'Pecho', 'Polea'),
    (uid, 'Elevaciones laterales', 'Hombros', 'Mancuernas'),
    (uid, 'Fondos en paralelas', 'Tríceps', 'Peso corporal'),
    (uid, 'Extensión de tríceps en polea', 'Tríceps', 'Polea')
  on conflict (user_id, name) do nothing;

  insert into public.routines (user_id, name, weekday, position)
  values (uid, 'Torso A · Empuje', 1, 0)
  returning id into r_id;

  insert into public.routine_exercises
    (user_id, routine_id, exercise_id, position, target_sets, rep_min, rep_max, rir_min, rir_max)
  select uid, r_id, e.id, v.pos, v.sets, v.rmin, v.rmax, 1, 2
  from (values
    ('Press de banca inclinado', 0, 3, 8, 10),
    ('Press militar con mancuernas', 1, 3, 8, 10),
    ('Aperturas en polea', 2, 3, 12, 15),
    ('Elevaciones laterales', 3, 4, 12, 15),
    ('Fondos en paralelas', 4, 3, 8, 12),
    ('Extensión de tríceps en polea', 5, 3, 10, 12)
  ) as v(name, pos, sets, rmin, rmax)
  join public.exercises e on e.user_id = uid and e.name = v.name;
end;
$$;
