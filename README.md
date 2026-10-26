# Gym

App personal para llevar el progreso en el gym: series, peso, reps, RIR, rutinas y descansos. Next.js (App Router) + Tailwind + Supabase, pensada para desplegarse en Vercel y usarse desde el celular.

## Estado (Fase 1)

- Login con correo y contraseña (Supabase Auth), todo protegido por RLS.
- **Hoy**: rutina del día, semana, racha y última sesión.
- **Entrenar**: lista de rutinas y sesión en curso (peso, reps, RIR, calentamiento, PR, temporizador de descanso, referencia de la vez pasada).
- Instalable como PWA (manifest). Progreso y Calendario son pantallas de relleno para la Fase 2.

## Puesta en marcha

1. **Supabase**: crea un proyecto en supabase.com → SQL Editor → pega y ejecuta `supabase/schema.sql`.
2. **Tu usuario**: Authentication → Users → *Add user* (tu correo y contraseña). Como la app es solo para ti, desactiva los registros abiertos en Authentication → Providers → Email → *Allow new users to sign up*.
3. **Variables**: copia `.env.example` a `.env.local` y llena `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API). No subas `.env.local` al repositorio.
4. Local: `npm install` y `npm run dev`. La primera vez, en **Hoy** pulsa *Cargar rutina de ejemplo*.

## Despliegue en Vercel

1. Sube el proyecto a un repositorio de GitHub.
2. En Vercel: *Add New → Project* → importa el repo (Next.js se detecta solo).
3. En *Environment Variables* agrega las mismas variables de `.env.example`.
4. Deploy. Luego, en el celular, abre la URL y "Agregar a pantalla de inicio".

## Estructura

- `src/app/(app)/` pantallas con barra inferior (Hoy, Entrenar, Progreso, Calendario).
- `src/app/actions.ts` acciones de servidor (iniciar sesión de entreno, guardar serie, PR, terminar).
- `src/proxy.ts` refresca la sesión y redirige a `/login`.
- `supabase/schema.sql` tablas, RLS, vista de series por grupo muscular y `seed_defaults()`.

## Siguiente (Fase 2)

Historial por ejercicio con gráfica y 1RM estimado, series efectivas por grupo muscular, calendario y racha, editor de rutinas y ejercicios, y modo offline para sesiones.
