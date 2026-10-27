import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { InstallPrompt } from "@/components/InstallPrompt";
import { createClient } from "@/lib/supabase/server";
import { getUnit } from "@/lib/unit.server";
import { UnitToggle } from "@/components/UnitToggle";
import { seedDefaults, startWorkout } from "@/app/actions";
import { SignOutForm } from "@/components/SignOutForm";
import { DuplicatePrompt } from "@/components/DuplicatePrompt";
import {
  addDays,
  formatLong,
  formatShort,
  isoWeekday,
  localYmd,
  minutesBetween,
  streakWeeks,
  weekStart,
} from "@/lib/dates";
import type { Routine, RoutineExercise } from "@/lib/types";

const DAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];

export const metadata = { title: "Hoy" };

export default async function HoyPage() {
  const supabase = await createClient();
  const unit = await getUnit();
  const now = new Date();
  const todayYmd = localYmd(now);
  const todayWeekday = isoWeekday(now);

  const since = new Date(now.getTime() - 100 * 24 * 3600 * 1000).toISOString();

  const openSince = new Date(now.getTime() - 72 * 3600 * 1000).toISOString();

  const [routinesRes, workoutsRes, lastRes, itemsRes, openRes, exercisesRes] = await Promise.all([
    supabase.from("routines").select("*").order("position"),
    supabase
      .from("workouts")
      .select("started_at")
      .not("ended_at", "is", null)
      .gte("started_at", since),
    supabase
      .from("workouts")
      .select("id, name, started_at, ended_at, sets(count)")
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("routine_exercises")
      .select("*, exercise:exercises!exercise_id(*), alt_exercise:exercises!alt_exercise_id(*)")
      .order("position"),
    supabase
      .from("workouts")
      .select("id, name, started_at, sets(count)")
      .is("ended_at", null)
      .gte("started_at", openSince)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("exercises").select("id, name, sets(count)"),
  ]);

  const routines = (routinesRes.data ?? []) as Routine[];
  const doneDates = (workoutsRes.data ?? []).map((w) => new Date(w.started_at));
  const doneDays = new Set(doneDates.map((d) => localYmd(d)));
  const streak = streakWeeks(doneDates, now);

  const todayRoutine =
    routines.find((r) => r.weekday === todayWeekday) ?? routines[0] ?? null;

  const exercises = ((itemsRes.data ?? []) as RoutineExercise[]).filter(
    (re) => re.routine_id === todayRoutine?.id,
  );

  const monday = weekStart(now);
  const week = DAY_LETTERS.map((letter, i) => {
    const ymd = addDays(monday, i);
    return {
      letter,
      day: Number(ymd.slice(8)),
      isToday: ymd === todayYmd,
      planned: routines.some((r) => r.weekday === i + 1),
      done: doneDays.has(ymd),
    };
  });

  const plan = routines
    .filter((r) => r.weekday)
    .sort((a, b) => (a.weekday ?? 0) - (b.weekday ?? 0))
    .map((r) => r.name.split(" · ")[0])
    .join(" · ");

  const last = lastRes.data as
    | { id: string; name: string; started_at: string; ended_at: string; sets: { count: number }[] }
    | null;

  const open = openRes.data as { id: string; name: string; started_at: string; sets: { count: number }[] } | null;

  const allExercises = ((exercisesRes.data ?? []) as { id: string; name: string; sets: { count: number }[] }[]).map(
    (e) => ({ id: e.id, name: e.name, sets: e.sets?.[0]?.count ?? 0 }),
  );

  const userName = process.env.NEXT_PUBLIC_USER_NAME;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted">{formatLong(now)}</p>
          <h1 className="font-display text-[38px] font-bold leading-[1.05]">
            {userName ? `Hola, ${userName}` : "Hola"}
          </h1>
        </div>
        {streak > 0 && (
          <span className="flex h-8 items-center rounded-full border border-[#3a4020] bg-accent-dim px-3 text-[13px] font-semibold text-accent">
            Racha · {streak} {streak === 1 ? "semana" : "semanas"}
          </span>
        )}
      </header>

      <DuplicatePrompt exercises={allExercises} />
      <InstallPrompt />

      <section aria-label="Semana" className="flex flex-col gap-2">
        <div className="flex justify-between">
          {week.map((d, i) => (
            <div key={i} className="flex w-[42px] flex-col items-center gap-1.5">
              <span className="text-xs font-medium text-muted">{d.letter}</span>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl font-display text-xl font-bold ${
                  d.isToday
                    ? "bg-accent text-bg"
                    : d.done
                      ? "bg-surface-2 text-accent ring-1 ring-accent"
                      : d.planned
                        ? "bg-surface-2 text-text"
                        : "text-muted"
                }`}
              >
                {d.day}
              </div>
            </div>
          ))}
        </div>
        {plan && <p className="text-xs text-muted">Plan: {plan}</p>}
      </section>

      {open && (
        <section
          aria-label="Sesión en curso"
          className="flex flex-col gap-3 rounded-[20px] bg-accent-dim p-[18px] ring-1 ring-[#3a4020]"
        >
          <div>
            <p className="text-xs font-semibold tracking-[0.08em] text-accent">SESIÓN A LA MITAD</p>
            <p className="font-display text-[28px] font-bold leading-[1.1]">{open.name}</p>
            <p className="text-sm text-muted">
              Empezó {formatShort(new Date(open.started_at))} · {open.sets?.[0]?.count ?? 0} series guardadas
            </p>
          </div>
          <Link
            href={`/entrenar/${open.id}`}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-accent text-lg font-semibold text-bg"
          >
            Continuar entrenamiento
          </Link>
        </section>
      )}

      {todayRoutine ? (
        <section className="flex flex-col rounded-[20px] bg-surface p-[18px]">
          <p className="text-xs font-semibold tracking-[0.08em] text-accent">
            ENTRENAMIENTO DE HOY
          </p>
          <h2 className="mt-1.5 font-display text-[34px] font-bold leading-[1.1]">
            {todayRoutine.name}
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {exercises.length} ejercicios
          </p>

          <ul className="mt-3">
            {exercises.map((re) => (
              <li
                key={re.id}
                className="flex h-[38px] items-center justify-between border-t border-line text-[15px]"
              >
                <span>
                  {re.exercise.name}
                  {re.alt_exercise && <span className="text-muted"> / {re.alt_exercise.name}</span>}
                  {re.with_previous && <span className="text-muted"> · después</span>}
                </span>
                <span className="tabular text-muted">
                  {re.target_sets} × {re.rep_min}–{re.rep_max}
                </span>
              </li>
            ))}
          </ul>

          <form action={startWorkout.bind(null, todayRoutine.id)} className="mt-3.5">
            <SubmitButton
              pendingText="Abriendo sesión…"
              className="h-14 w-full rounded-2xl bg-accent text-lg font-semibold text-bg"
            >
              Iniciar entrenamiento
            </SubmitButton>
          </form>
        </section>
      ) : (
        <section className="flex flex-col gap-3 rounded-[20px] bg-surface p-[18px]">
          <h2 className="font-display text-3xl font-bold">Aún no hay rutinas</h2>
          <p className="text-sm text-muted">
            Crea tu propia rutina o carga una de ejemplo (Torso A · Empuje) y luego la ajustas.
          </p>
          <Link
            href="/rutinas/nueva"
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-accent text-lg font-semibold text-bg"
          >
            Crear mi rutina
          </Link>
          <form action={seedDefaults}>
            <SubmitButton
              pendingText="Cargando…"
              className="h-14 w-full rounded-2xl bg-surface-2 text-lg font-semibold text-text"
            >
              Cargar rutina de ejemplo
            </SubmitButton>
          </form>
        </section>
      )}

      {last && (
        <Link
          href={`/historial/${last.id}`}
          className="flex h-16 items-center justify-between rounded-2xl bg-surface px-4"
        >
          <div>
            <p className="text-xs text-muted">Última sesión</p>
            <p className="text-[15px] font-medium">
              {formatShort(new Date(last.started_at))} · {last.name}
            </p>
          </div>
          <p className="text-sm text-muted">
            {last.sets?.[0]?.count ?? 0} series ·{" "}
            {minutesBetween(last.started_at, last.ended_at)} min
          </p>
        </Link>
      )}

      <Link href="/historial" className="text-sm text-accent underline">
        Ver y editar sesiones anteriores
      </Link>

      <UnitToggle unit={unit} />

      <SignOutForm />
    </div>
  );
}
