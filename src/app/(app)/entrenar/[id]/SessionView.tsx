"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addLocalSet,
  dropQueuedSave,
  enqueue,
  getDeleted,
  getLocalSets,
  getQueue,
  markDeleted,
  removeLocalSets,
  snapshotStorage,
  subscribeStorage,
} from "@/lib/offline";
import { FAILED_EVENT, SAVED_EVENT, flushQueue } from "@/lib/sync";
import type { LastBest, RoutineExercise, SetKind, SetRow, Workout } from "@/lib/types";
import { defaultWeight, fromDisplay, stepFor, toDisplay, type Unit } from "@/lib/units";
import { suggest } from "@/lib/progression";
import { ExerciseNote, PlateCalc, SuggestionChip } from "@/components/SessionExtras";

// Solo se llama desde manejadores de eventos (nunca durante el render).
const nowMs = () => Date.now();

type Props = {
  workout: Workout;
  items: RoutineExercise[];
  sets: SetRow[];
  lastBest: Record<string, LastBest>;
  unit: Unit;
};

// Agrupa los ejercicios: los marcados "va después del anterior" se hacen en el mismo bloque.
// Ejercicio que se hace hoy en este lugar de la rutina: el principal o su variante.
function pickEx(re: RoutineExercise, useAlt: boolean) {
  return useAlt && re.alt_exercise && re.alt_exercise_id
    ? { id: re.alt_exercise_id, ex: re.alt_exercise }
    : { id: re.exercise_id, ex: re.exercise };
}

function groupSlots(items: RoutineExercise[]) {
  const slots: RoutineExercise[][] = [];
  for (const it of items) {
    if (it.with_previous && slots.length > 0) slots[slots.length - 1].push(it);
    else slots.push([it]);
  }
  return slots;
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

export function SessionView({ workout, items, sets: serverSets, lastBest, unit }: Props) {
  const router = useRouter();
  // Las series se guardan primero en el teléfono y se ven al instante, con o sin señal.
  const localSnapshot = useSyncExternalStore(subscribeStorage, snapshotStorage, () => "");
  const sets = useMemo(() => {
    void localSnapshot; // se recalcula cuando cambia el almacenamiento local
    const deleted = new Set(getDeleted());
    const known = new Set(serverSets.map((s) => s.id));
    const extra = getLocalSets(workout.id).filter((s) => !known.has(s.id));
    return [...serverSets, ...extra].filter((s) => !deleted.has(s.id));
  }, [serverSets, localSnapshot, workout.id]);

  // Cuando el servidor ya trae una serie, se borra su copia local.
  useEffect(() => {
    removeLocalSets(serverSets.map((s) => s.id));
  }, [serverSets]);

  const [finishing, setFinishing] = useState(false);
  const [finishedOffline, setFinishedOffline] = useState(false);
  const slots = useMemo(() => groupSlots(items), [items]);
  // Variante elegida por ejercicio de rutina (true = la variante). Arranca con la que ya tenga series.
  const [variant, setVariant] = useState<Record<string, boolean>>(() => {
    const v: Record<string, boolean> = {};
    for (const it of items) {
      if (!it.alt_exercise_id) continue;
      const a = serverSets.filter((s) => s.exercise_id === it.alt_exercise_id).length;
      const b = serverSets.filter((s) => s.exercise_id === it.exercise_id).length;
      if (a > b) v[it.id] = true;
    }
    return v;
  });
  // Cuál ejercicio de cada bloque está activo (0 = primero, 1 = el que sigue…).
  const [sub, setSub] = useState<Record<string, number>>({});

  // Ejercicio inicial: el primero que aún no completa sus series objetivo.
  const initialIndex = useMemo(() => {
    const i = slots.findIndex((slot) =>
      slot.some(
        (re) =>
          sets.filter(
            (s) =>
              (s.exercise_id === re.exercise_id || s.exercise_id === re.alt_exercise_id) &&
              s.kind !== "warmup",
          ).length <
          re.target_sets,
      ),
    );
    return i === -1 ? Math.max(0, slots.length - 1) : i;
    // solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Valores más útiles para precargar al entrar a un ejercicio.
  function defaultsFor(i: number, subIdx = 0, map: Record<string, boolean> = variant) {
    const slot = slots[i];
    if (!slot) return { weight: String(defaultWeight(unit)), reps: "10", rir: null as number | null };
    const it = slot[subIdx] ?? slot[0];
    const id = pickEx(it, !!map[it.id]).id;
    const mine = sets.filter((s) => s.exercise_id === id);
    const last = mine[mine.length - 1];
    const best = lastBest[id];
    return {
      weight: fmt(
        last || best ? toDisplay(last?.weight_kg ?? best!.weight_kg, unit) : defaultWeight(unit),
      ),
      reps: String(last?.reps ?? it.rep_max ?? 10),
      rir: (last?.rir ?? it.rir_max) as number | null,
    };
  }

  const [index, setIndex] = useState(initialIndex);
  const [weight, setWeight] = useState(() => defaultsFor(initialIndex).weight);
  const [reps, setReps] = useState(() => defaultsFor(initialIndex).reps);
  const [rir, setRir] = useState<number | null>(() => defaultsFor(initialIndex).rir);
  const [warmup, setWarmup] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [prFlash, setPrFlash] = useState(false);

  // Resultado de la sincronización: PR conseguido o error del servidor.
  useEffect(() => {
    function onSaved(e: Event) {
      if ((e as CustomEvent<{ isPr: boolean }>).detail.isPr) {
        setPrFlash(true);
        setTimeout(() => setPrFlash(false), 4000);
      }
    }
    function onFailed(e: Event) {
      const { op, error } = (e as CustomEvent<{ op: string; error?: string }>).detail;
      if (op === "save") setError(error ?? "No se pudo guardar la serie. Inténtalo de nuevo.");
    }
    window.addEventListener(SAVED_EVENT, onSaved);
    window.addEventListener(FAILED_EVENT, onFailed);
    return () => {
      window.removeEventListener(SAVED_EVENT, onSaved);
      window.removeEventListener(FAILED_EVENT, onFailed);
    };
  }, []);

  const slot = slots[index];
  const members = (slot ?? []).map((re) => {
    const p = pickEx(re, !!variant[re.id]);
    return { id: p.id, ex: p.ex, re };
  });
  const activeSub = slot ? Math.min(sub[String(index)] ?? 0, members.length - 1) : 0;
  const active = slot ? members[activeSub] : null;
  const item = active?.re;
  const exSets = active ? sets.filter((s) => s.exercise_id === active.id) : [];

  function goTo(i: number) {
    const d = defaultsFor(i, 0);
    setIndex(i);
    setWeight(d.weight);
    setReps(d.reps);
    setRir(d.rir);
    setWarmup(false);
    setError(null);
  }

  function selectSub(n: number) {
    if (!slot) return;
    setSub((m) => ({ ...m, [String(index)]: n }));
    const d = defaultsFor(index, n);
    setWeight(d.weight);
    setReps(d.reps);
    setRir(d.rir);
    setWarmup(false);
    setError(null);
  }

  // Numeración corrida: cada ejercicio cuenta como uno aunque compartan bloque.
  const sizes = slots.map((sl) => sl.length);
  const totalExercises = sizes.reduce((a, b) => a + b, 0);
  const firstNumber = 1 + sizes.slice(0, index).reduce((a, b) => a + b, 0);
  const numberLabel =
    (sizes[index] ?? 1) > 1
      ? `${firstNumber}–${firstNumber + sizes[index] - 1}`
      : String(firstNumber);

  function chooseVariant(re: RoutineExercise, useAlt: boolean, memberIndex: number) {
    if (!!variant[re.id] === useAlt) return;
    const next = { ...variant, [re.id]: useAlt };
    setVariant(next);
    if (memberIndex === activeSub) {
      const d = defaultsFor(index, memberIndex, next);
      setWeight(d.weight);
      setReps(d.reps);
      setRir(d.rir);
      setWarmup(false);
      setError(null);
    }
  }

  function objective(m: { id: string; re: RoutineExercise }) {
    const p = lastBest[m.id];
    const re = m.re;
    return `Objetivo ${re.target_sets} × ${re.rep_min}–${re.rep_max} · RIR ${re.rir_min}–${re.rir_max}${
      p ? ` · Última vez ${fmt(toDisplay(p.weight_kg, unit))} ${unit} × ${p.reps}${p.rir !== null ? ` @ RIR ${p.rir}` : ""}` : ""
    }`;
  }

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

  // Recomendación para la primera serie de trabajo, según la vez pasada y el rango de la rutina.
  const lastForActive = active ? lastBest[active.id] : undefined;
  const lastShown = lastForActive
    ? { weight: toDisplay(lastForActive.weight_kg, unit), reps: lastForActive.reps, rir: lastForActive.rir }
    : undefined;
  const suggestion =
    active && exSets.filter((s) => s.kind === "normal").length === 0
      ? suggest({
          last: lastShown,
          repMin: active.re.rep_min,
          repMax: active.re.rep_max,
          rirMax: active.re.rir_max,
          step: stepFor(unit),
        })
      : null;

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

  const done = members.every(
    (m) =>
      sets.filter((s) => s.exercise_id === m.id && s.kind !== "warmup").length >= m.re.target_sets,
  );
  const nextNumber = exSets.length + 1;

  function onSave() {
    const entered = Number(weight.replace(",", "."));
    const w = fromDisplay(entered, unit);
    const r = Number(reps);
    if (!Number.isFinite(entered) || entered < 0 || !Number.isInteger(r) || r < 1) {
      setError("Revisa el peso y las repeticiones.");
      return;
    }
    setError(null);

    const id = crypto.randomUUID();
    const exerciseId = active!.id;
    const kind: SetKind = warmup ? "warmup" : "normal";
    const wasWarmup = warmup;
    const rir2 = wasWarmup ? null : rir;
    const rest = active!.re.rest_seconds;
    const setNoteText = note.trim() || null;
    setNote("");

    // Se guarda en el teléfono y entra a la cola; se envía en orden en cuanto haya señal.
    addLocalSet({
      id,
      workout_id: workout.id,
      exercise_id: exerciseId,
      set_number: nextNumber,
      kind,
      weight_kg: w,
      reps: r,
      rir: rir2,
      is_pr: false,
      note: setNoteText,
      created_at: new Date().toISOString(),
    });
    enqueue({ op: "save", id, workoutId: workout.id, exerciseId, kind, weightKg: w, reps: r, rir: rir2, note: setNoteText });
    void flushQueue().then((sent) => {
      if (sent > 0) router.refresh();
    });

    if (!wasWarmup) {
      setRestTotal(rest);
      const t = nowMs();
      setRestEnd(t + rest * 1000);
      setNow(t);
    }
    setWarmup(false);
    if (!wasWarmup && members.length > 1) {
      // Pasa al siguiente ejercicio del bloque que aún tenga series pendientes.
      for (let k = 1; k < members.length; k++) {
        const j = (activeSub + k) % members.length;
        const m = members[j];
        const n = sets.filter((s) => s.exercise_id === m.id && s.kind !== "warmup").length;
        if (n < m.re.target_sets) {
          selectSub(j);
          break;
        }
      }
    }
  }

  function onDelete(id: string) {
    if (!window.confirm("¿Borrar esta serie?")) return;
    markDeleted(id);
    // Si nunca llegó al servidor, basta con quitarla de la cola.
    if (dropQueuedSave(id)) {
      removeLocalSets([id]);
      return;
    }
    enqueue({ op: "del", id, workoutId: workout.id });
    void flushQueue();
  }

  async function onFinish() {
    setFinishing(true);
    enqueue({ op: "finish", workoutId: workout.id, endedAt: new Date().toISOString() });
    await flushQueue();
    const stillQueued = getQueue().some((o) => o.op === "finish" && o.workoutId === workout.id);
    if (stillQueued) {
      // Sin señal: la sesión queda terminada en el teléfono y se envía cuando vuelva.
      setFinishedOffline(true);
      setFinishing(false);
      return;
    }
    router.push(`/historial/${workout.id}`);
  }

  if (finishedOffline) {
    return (
      <div className="flex flex-col gap-4 pt-10 text-center">
        <h1 className="font-display text-[34px] font-bold leading-[1.05]">Sesión terminada</h1>
        <p className="text-muted">
          Se guardó en tu teléfono y se enviará sola cuando vuelva la señal. Toca Ir a Hoy cuando ya tengas señal y no cierres sesión hasta que se envíe.
        </p>
        <Link href="/" className="mx-auto rounded-full bg-accent px-5 py-3 font-semibold text-bg">
          Ir a Hoy
        </Link>
      </div>
    );
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
        <button
          type="button"
          onClick={onFinish}
          disabled={finishing}
          className="h-11 rounded-full border border-line px-4 text-[15px] font-semibold text-text disabled:opacity-60"
        >
          Terminar
        </button>
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
              disabled={index === slots.length - 1}
              onClick={() => goTo(index + 1)}
              className="-mr-2.5 flex h-11 w-11 items-center justify-center text-text disabled:opacity-30"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        {members.length === 1 && (
          <>
            <h1 className="font-display text-[34px] font-bold leading-[1.05]">
              {members[0].ex.name}
            </h1>
            <p className="mt-1 text-sm text-muted">{objective(members[0])}</p>
          </>
        )}
      </div>

      {members.map((m, mi) => {
        const mSets = sets.filter((s) => s.exercise_id === m.id);
        const mWork = mSets.filter((s) => s.kind !== "warmup").length;
        const isActive = mi === activeSub;
        const pair = members.length > 1;
        return (
          <div
            key={m.re.id}
            className={
              pair
                ? `flex flex-col rounded-2xl p-3 ${isActive ? "bg-surface ring-1 ring-accent" : "bg-surface/50"}`
                : "flex flex-col"
            }
          >
            {pair && (
              <button type="button" onClick={() => selectSub(mi)} className="mb-2 text-left">
                <p className="text-xs font-semibold tracking-[0.08em] text-accent">
                  {mi === 0 ? "PRIMERO" : "DESPUÉS"} · EJERCICIO {firstNumber + mi} DE {totalExercises}
                </p>
                <p className="font-display text-[28px] font-bold leading-[1.05]">
                  {m.ex.name}{" "}
                  <span className="tabular text-base font-semibold text-muted">
                    {mWork}/{m.re.target_sets}
                  </span>
                </p>
                <p className="text-sm text-muted">{objective(m)}</p>
              </button>
            )}

            {m.re.alt_exercise && (
              <div
                role="group"
                aria-label="Variante del ejercicio"
                className="mb-2 flex gap-1 rounded-xl bg-surface-2 p-1"
              >
                {[false, true].map((useAlt) => {
                  const ex = useAlt ? m.re.alt_exercise! : m.re.exercise;
                  const on = !!variant[m.re.id] === useAlt;
                  return (
                    <button
                      key={String(useAlt)}
                      type="button"
                      aria-pressed={on}
                      onClick={() => chooseVariant(m.re, useAlt, mi)}
                      className={`min-h-11 flex-1 rounded-[10px] px-2 text-[13px] font-semibold leading-tight ${
                        on ? "bg-accent text-bg" : "text-text"
                      }`}
                    >
                      {ex.name}
                    </button>
                  );
                })}
              </div>
            )}

            <ExerciseNote key={m.id} exerciseId={m.id} initial={m.ex.notes ?? null} />

            <div className="grid h-6 grid-cols-[44px_repeat(3,minmax(0,1fr))_40px] items-center text-xs font-medium tracking-[0.06em] text-muted">
              <span>SERIE</span>
              <span>{unit.toUpperCase()}</span>
              <span>REPS</span>
              <span>RIR</span>
              <span />
            </div>

            {mSets.map((s) => (
              <div key={s.id} className="border-t border-line">
              <div className="grid h-[42px] grid-cols-[44px_repeat(3,minmax(0,1fr))_40px] items-center font-display text-[22px] font-semibold">
                <span className="font-sans text-sm text-muted">
                  {s.kind === "warmup" ? "C" : s.set_number}
                </span>
                <span className="tabular">{fmt(toDisplay(s.weight_kg, unit))}</span>
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
              {s.note && <p className="pb-1.5 pl-11 text-xs text-muted">{s.note}</p>}
              </div>
            ))}

            {isActive && (
              <div className="grid h-[42px] grid-cols-[44px_repeat(3,minmax(0,1fr))_40px] items-center rounded-[10px] bg-accent-dim font-display text-[22px] font-bold text-accent ring-1 ring-inset ring-accent">
                <span className="pl-2 font-sans text-sm font-semibold">{warmup ? "C" : nextNumber}</span>
                <span className="tabular">{weight || "—"}</span>
                <span className="tabular">{reps || "—"}</span>
                <span className="tabular">{warmup ? "—" : (rir ?? "—")}</span>
                <span className="flex justify-center">
                  <span className="h-[18px] w-[18px] rounded-full border-2 border-accent" />
                </span>
              </div>
            )}
          </div>
        );
      })}

      <span className="sr-only" role="status" aria-live="polite">
        {restEnd !== null && !resting ? "Descanso terminado" : ""}
      </span>

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
        {suggestion && active && (
          <SuggestionChip
            suggestion={suggestion}
            last={lastShown}
            targetSets={active.re.target_sets}
            unit={unit}
            onUse={(sg) => {
              setWeight(fmt(sg.weight));
              setReps(String(sg.reps));
            }}
          />
        )}

        <div className="flex gap-3">
          <Stepper label={`PESO · ${unit.toUpperCase()}`} value={weight} step={stepFor(unit)} decimal onChange={setWeight} />
          <Stepper label="REPS" value={reps} step={1} onChange={setReps} />
        </div>

        <PlateCalc weight={weight} unit={unit} />

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

        <input
          aria-label="Nota de esta serie"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          placeholder="Nota de esta serie (opcional)"
          className="h-11 rounded-xl bg-surface-2 px-3 text-sm text-text outline-none"
        />

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
          className="h-14 rounded-2xl bg-accent text-lg font-semibold text-bg disabled:opacity-60"
        >
          {warmup ? "Guardar calentamiento" : `Guardar serie ${nextNumber}`}
        </button>

        {done && index < slots.length - 1 && (
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
