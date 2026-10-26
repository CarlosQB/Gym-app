"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { deleteSet, finishWorkout, saveSet } from "@/app/actions";
import type { LastBest, RoutineExercise, SetRow, Workout } from "@/lib/types";

type Props = {
  workout: Workout;
  items: RoutineExercise[];
  sets: SetRow[];
  lastBest: Record<string, LastBest>;
  initialAlt: Record<string, boolean>;
};

// Ejercicio que se está haciendo en este lugar de la rutina (principal o alterno).
function pick(it: RoutineExercise, useAlt: boolean) {
  return useAlt && it.alt_exercise && it.alt_exercise_id
    ? { id: it.alt_exercise_id, ex: it.alt_exercise }
    : { id: it.exercise_id, ex: it.exercise };
}

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

function clock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${String(h).padStart(2, "0")}:${mm}:${ss}` : `${mm}:${ss}`;
}

function Stepper(props: {
  label: string;
  value: string;
  step: number;
  min?: number;
  decimal?: boolean;
  onChange: (v: string) => void;
}) {
  const { label, value, step, min = 0, decimal, onChange } = props;
  const bump = (dir: 1 | -1) => {
    const cur = Number(value.replace(",", ".")) || 0;
    const next = Math.max(min, Math.round((cur + dir * step) * 100) / 100);
    onChange(fmt(next));
  };
  return (
    <div className="min-w-0 flex-1">
      <p className="mb-1.5 text-xs font-medium tracking-[0.06em] text-muted">{label}</p>
      <div className="flex h-14 items-center rounded-[14px] bg-surface-2">
        <button
          type="button"
          aria-label={`Restar ${step} a ${label}`}
          onClick={() => bump(-1)}
          className="flex h-14 w-11 items-center justify-center text-text"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M5 12h14" />
          </svg>
        </button>
        <input
          aria-label={label}
          inputMode={decimal ? "decimal" : "numeric"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => e.target.select()}
          className="tabular min-w-0 flex-1 bg-transparent text-center font-display text-[30px] font-bold text-text outline-none"
        />
        <button
          type="button"
          aria-label={`Sumar ${step} a ${label}`}
          onClick={() => bump(1)}
          className="flex h-14 w-11 items-center justify-center text-text"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function SessionView({ workout, items, sets, lastBest, initialAlt }: Props) {
  const [pending, startTransition] = useTransition();
  const [alt, setAlt] = useState<Record<string, boolean>>(initialAlt);

  // Ejercicio inicial: el primero que aún no completa sus series objetivo.
  const initialIndex = useMemo(() => {
    const i = items.findIndex(
      (it) =>
        sets.filter(
          (s) =>
            (s.exercise_id === it.exercise_id || s.exercise_id === it.alt_exercise_id) &&
            s.kind !== "warmup",
        ).length <
        it.target_sets,
    );
    return i === -1 ? Math.max(0, items.length - 1) : i;
    // solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Valores más útiles para precargar al entrar a un ejercicio.
  function defaultsFor(i: number, map: Record<string, boolean> = alt) {
    const it = items[i];
    if (!it) return { weight: "20", reps: "10", rir: null as number | null };
    const id = pick(it, !!map[it.id]).id;
    const mine = sets.filter((s) => s.exercise_id === id);
    const last = mine[mine.length - 1];
    const best = lastBest[id];
    return {
      weight: fmt(last?.weight_kg ?? best?.weight_kg ?? 20),
      reps: String(last?.reps ?? it.rep_max ?? 10),
      rir: (last?.rir ?? it.rir_max) as number | null,
    };
  }

  const [index, setIndex] = useState(initialIndex);
  const [weight, setWeight] = useState(() => defaultsFor(initialIndex).weight);
  const [reps, setReps] = useState(() => defaultsFor(initialIndex).reps);
  const [rir, setRir] = useState<number | null>(() => defaultsFor(initialIndex).rir);
  const [warmup, setWarmup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prFlash, setPrFlash] = useState(false);

  const item = items[index];
  const active = item ? pick(item, !!alt[item.id]) : null;
  const exSets = active ? sets.filter((s) => s.exercise_id === active.id) : [];
  const workingSets = exSets.filter((s) => s.kind !== "warmup");
  const prev = active ? lastBest[active.id] : undefined;

  function goTo(i: number) {
    const d = defaultsFor(i);
    setIndex(i);
    setWeight(d.weight);
    setReps(d.reps);
    setRir(d.rir);
    setWarmup(false);
    setError(null);
  }

  function swap() {
    if (!item) return;
    const next = { ...alt, [item.id]: !alt[item.id] };
    setAlt(next);
    const d = defaultsFor(index, next);
    setWeight(d.weight);
    setReps(d.reps);
    setRir(d.rir);
    setWarmup(false);
    setError(null);
  }

  // Los alternos cuentan como ejercicios aparte: 6 ejercicios aunque haya 4 lugares.
  const sizes = items.map((it) => (it.alt_exercise_id ? 2 : 1));
  const totalExercises = sizes.reduce((a, b) => a + b, 0);
  const firstNumber = 1 + sizes.slice(0, index).reduce((a, b) => a + b, 0);
  const numberLabel =
    sizes[index] === 2 ? `${firstNumber} · ${firstNumber + 1}` : String(firstNumber);

  // Reloj de la sesión
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = new Date(workout.started_at).getTime();
    const tick = () => setElapsed((Date.now() - start) / 1000);
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [workout.started_at]);

  // Temporizador de descanso
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!restEnd) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [restEnd]);
  const restLeft = restEnd ? Math.max(0, (restEnd - now) / 1000) : 0;
  const resting = restEnd !== null && restLeft > 0;

  if (!item) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-muted">Esta sesión no tiene ejercicios.</p>
        <Link href="/" className="text-accent underline">
          Volver
        </Link>
      </div>
    );
  }

  const done = workingSets.length >= item.target_sets;
  const nextNumber = exSets.length + 1;

  function onSave() {
    const w = Number(weight.replace(",", "."));
    const r = Number(reps);
    if (!Number.isFinite(w) || w < 0 || !Number.isInteger(r) || r < 1) {
      setError("Revisa el peso y las repeticiones.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await saveSet({
        workoutId: workout.id,
        exerciseId: active!.id,
        kind: warmup ? "warmup" : "normal",
        weightKg: w,
        reps: r,
        rir: warmup ? null : rir,
      });
      if (!res.ok) {
        setError(res.error ?? "No se pudo guardar.");
        return;
      }
      if (res.isPr) {
        setPrFlash(true);
        setTimeout(() => setPrFlash(false), 4000);
      }
      if (!warmup) {
        const total = item.rest_seconds;
        setRestTotal(total);
        setRestEnd(Date.now() + total * 1000);
        setNow(Date.now());
      }
      setWarmup(false);
    });
  }

  function onDelete(id: string) {
    if (!window.confirm("¿Borrar esta serie?")) return;
    startTransition(async () => {
      await deleteSet(id, workout.id);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Barra superior */}
      <div className="flex h-12 items-center justify-between">
        <Link
          href="/"
          aria-label="Volver"
          className="-ml-2.5 flex h-11 w-11 items-center justify-center text-text"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <div className="text-center">
          <p className="text-[13px] text-muted">{workout.name}</p>
          <p className="tabular font-display text-[22px] font-semibold leading-[1.1]">
            {clock(elapsed)}
          </p>
        </div>
        <form action={finishWorkout.bind(null, workout.id)}>
          <button
            type="submit"
            className="h-11 rounded-full border border-line px-4 text-[15px] font-semibold text-text"
          >
            Terminar
          </button>
        </form>
      </div>

      {/* Ejercicio */}
      <div>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold tracking-[0.08em] text-accent">
            EJERCICIO {numberLabel} DE {totalExercises}
          </p>
          <div className="flex">
            <button
              type="button"
              aria-label="Ejercicio anterior"
              disabled={index === 0}
              onClick={() => goTo(index - 1)}
              className="flex h-11 w-11 items-center justify-center text-text disabled:opacity-30"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Ejercicio siguiente"
              disabled={index === items.length - 1}
              onClick={() => goTo(index + 1)}
              className="-mr-2.5 flex h-11 w-11 items-center justify-center text-text disabled:opacity-30"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        <h1 className="font-display text-[34px] font-bold leading-[1.05]">
          {active!.ex.name}
        </h1>
        {item.alt_exercise && (
          <button
            type="button"
            onClick={swap}
            className="mt-1 h-9 rounded-full bg-surface-2 px-3 text-[13px] font-semibold text-accent"
          >
            Cambiar a {alt[item.id] ? item.exercise.name : item.alt_exercise.name}
          </button>
        )}
        <p className="mt-1 text-sm text-muted">
          Objetivo {item.target_sets} × {item.rep_min}–{item.rep_max} · RIR {item.rir_min}–
          {item.rir_max}
          {prev ? ` · Última vez ${fmt(prev.weight_kg)} kg × ${prev.reps}${prev.rir !== null ? ` @ RIR ${prev.rir}` : ""}` : ""}
        </p>
      </div>

      {/* Series */}
      <div className="flex flex-col">
        <div className="grid h-6 grid-cols-[44px_repeat(3,minmax(0,1fr))_40px] items-center text-xs font-medium tracking-[0.06em] text-muted">
          <span>SERIE</span>
          <span>KG</span>
          <span>REPS</span>
          <span>RIR</span>
          <span />
        </div>

        {exSets.map((s) => (
          <div
            key={s.id}
            className="grid h-[42px] grid-cols-[44px_repeat(3,minmax(0,1fr))_40px] items-center border-t border-line font-display text-[22px] font-semibold"
          >
            <span className="font-sans text-sm text-muted">
              {s.kind === "warmup" ? "C" : s.set_number}
            </span>
            <span className="tabular">{fmt(s.weight_kg)}</span>
            <span className="tabular">{s.reps}</span>
            <span className="tabular text-muted">{s.rir ?? "—"}</span>
            <button
              type="button"
              aria-label={`Borrar serie ${s.set_number}`}
              onClick={() => onDelete(s.id)}
              className="flex h-11 items-center justify-center"
            >
              {s.is_pr ? (
                <span className="rounded-full bg-warn px-1.5 font-sans text-[11px] font-bold text-bg">
                  PR
                </span>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#cdf545" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12l5 5 9-10" />
                </svg>
              )}
            </button>
          </div>
        ))}

        {/* Fila activa */}
        <div className="grid h-[42px] grid-cols-[44px_repeat(3,minmax(0,1fr))_40px] items-center rounded-[10px] bg-accent-dim font-display text-[22px] font-bold text-accent ring-1 ring-inset ring-accent">
          <span className="pl-2 font-sans text-sm font-semibold">{warmup ? "C" : nextNumber}</span>
          <span className="tabular">{weight || "—"}</span>
          <span className="tabular">{reps || "—"}</span>
          <span className="tabular">{warmup ? "—" : (rir ?? "—")}</span>
          <span className="flex justify-center">
            <span className="h-[18px] w-[18px] rounded-full border-2 border-accent" />
          </span>
        </div>
      </div>

      {/* Descanso */}
      {resting && (
        <div className="flex h-14 items-center gap-2.5 rounded-2xl bg-surface pl-4 pr-1.5">
          <span className="text-[13px] text-muted">Descanso</span>
          <span className="tabular font-display text-[26px] font-bold">{clock(restLeft)}</span>
          <div className="h-1.5 min-w-0 flex-1 rounded-full bg-line">
            <div
              className="h-1.5 rounded-full bg-accent"
              style={{ width: `${Math.min(100, Math.max(0, (restLeft / Math.max(1, restTotal)) * 100))}%` }}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setRestEnd((e) => (e ? e + 15000 : e));
              setRestTotal((t) => t + 15);
            }}
            className="h-11 px-2 text-sm font-semibold text-text"
          >
            +15 s
          </button>
          <button
            type="button"
            onClick={() => setRestEnd(null)}
            className="h-11 px-2.5 text-sm font-semibold text-text"
          >
            Saltar
          </button>
        </div>
      )}

      {/* Captura */}
      <div className="flex flex-col gap-2.5 rounded-[20px] bg-surface p-3.5">
        <div className="flex gap-3">
          <Stepper label="PESO · KG" value={weight} step={2.5} decimal onChange={setWeight} />
          <Stepper label="REPS" value={reps} step={1} onChange={setReps} />
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium tracking-[0.06em] text-muted">
            RIR · REPS EN RESERVA
          </p>
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                disabled={warmup}
                aria-pressed={rir === n}
                onClick={() => setRir(n)}
                className={`h-11 flex-1 rounded-xl font-display text-[22px] font-bold disabled:opacity-40 ${
                  rir === n && !warmup ? "bg-accent text-bg" : "bg-surface-2 text-text"
                }`}
              >
                {n === 4 ? "4+" : n}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          aria-pressed={warmup}
          onClick={() => setWarmup((v) => !v)}
          className={`h-11 rounded-xl text-sm font-semibold ${
            warmup ? "bg-surface-2 text-accent ring-1 ring-accent" : "bg-surface-2 text-muted"
          }`}
        >
          {warmup ? "Serie de calentamiento" : "Marcar como calentamiento"}
        </button>

        {error && (
          <p role="alert" className="text-sm text-warn">
            {error}
          </p>
        )}
        {prFlash && (
          <p role="status" className="text-sm font-semibold text-warn">
            ¡Nuevo PR de peso en este ejercicio!
          </p>
        )}

        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="h-14 rounded-2xl bg-accent text-lg font-semibold text-bg disabled:opacity-60"
        >
          {pending ? "Guardando…" : warmup ? "Guardar calentamiento" : `Guardar serie ${nextNumber}`}
        </button>

        {done && index < items.length - 1 && (
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            className="h-12 rounded-xl border border-line text-[15px] font-semibold text-text"
          >
            Siguiente ejercicio →
          </button>
        )}
      </div>
    </div>
  );
}
