"use client";

import { useState, useTransition } from "react";
import { mergeExercises, updateExerciseNote } from "@/app/actions";
import type { PlanStep } from "@/lib/progression";
import type { Unit } from "@/lib/units";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2))));

const stepLabel = (st: { kind: string; weight: number; reps: number }, unit: Unit) =>
  `${fmt(st.weight)} ${unit} × ${st.reps}`;

/** Plan serie por serie (estimación) con lo de la vez pasada; marca la serie que toca. */
export function PlanCard({
  plan,
  last,
  done,
  unit,
  onUse,
}: {
  plan: PlanStep[];
  last: { kind: string; weight: number; reps: number }[];
  done: number;
  unit: Unit;
  onUse: (s: PlanStep) => void;
}) {
  // Número de serie de trabajo de cada paso (los calentamientos no cuentan).
  const workNumber = plan.map((_, i) => plan.slice(0, i + 1).filter((p) => p.kind !== "warmup").length);
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-accent-dim px-3 py-2.5 text-[13px] ring-1 ring-[#3a4020]">
      {last.length > 0 && (
        <p className="text-muted">
          La vez pasada:{" "}
          {last.map((s, i) => (
            <span key={i}>
              {i > 0 && " · "}
              {s.kind === "warmup" ? "C " : ""}
              {stepLabel(s, unit)}
            </span>
          ))}
        </p>
      )}
      <p className="font-semibold text-accent">Hoy (recomendado · estimación)</p>
      <ol className="flex flex-col gap-1">
        {plan.map((st, i) => {
          const isWarm = st.kind === "warmup";
          const state = i < done ? "done" : i === done ? "now" : "next";
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => onUse(st)}
                className={`flex min-h-9 w-full items-center justify-between rounded-lg px-2 text-left ${
                  state === "now" ? "bg-accent text-bg" : state === "done" ? "text-muted line-through" : "text-text"
                }`}
              >
                <span>
                  {isWarm ? "Calentamiento" : `Serie ${workNumber[i]}`}
                </span>
                <span className="font-display text-base font-bold">{stepLabel(st, unit)}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Ejercicio sin historial: puede que antes lo registraras con otro nombre. */
export function NoHistoryChip({
  exercise,
  history,
  onLinked,
}: {
  exercise: { id: string; name: string };
  history: { id: string; name: string; sets: number }[];
  onLinked: () => void;
}) {
  const [target, setTarget] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function link() {
    const old = history.find((h) => h.id === target);
    if (!old) return;
    if (!window.confirm(`"${exercise.name}" y "${old.name}" son el mismo ejercicio. Se junta su historial y se queda el nombre de tu rutina, "${exercise.name}". ¿Continuar?`)) return;
    start(async () => {
      const res = await mergeExercises(exercise.id, old.id, true);
      if (res.ok) onLinked();
      else setMsg(res.error ?? "No se pudo ligar.");
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-[13px] text-muted">
      <p>Sin historial con este nombre, así que aún no hay recomendación.</p>
      {history.length > 0 && (
        <>
          <p className="text-text">¿Antes lo registraste con otro nombre?</p>
          <div className="flex gap-2">
            <select
              aria-label="Nombre anterior del ejercicio"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="h-11 min-w-0 flex-1 rounded-xl bg-surface px-2 text-text"
            >
              <option value="">Elige…</option>
              {history.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} · {h.sets} series
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!target || pending}
              onClick={link}
              className="h-11 shrink-0 rounded-xl bg-accent px-3 font-semibold text-bg disabled:opacity-60"
            >
              {pending ? "…" : "Es el mismo"}
            </button>
          </div>
        </>
      )}
      {msg && <p role="alert" className="text-warn">{msg}</p>}
    </div>
  );
}

const PLATES: Record<Unit, number[]> = {
  lb: [45, 35, 25, 10, 5, 2.5],
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
};
const BARS: Record<Unit, number[]> = { lb: [45, 35, 15], kg: [20, 15, 10] };

export function PlateCalc({ weight, unit }: { weight: string; unit: Unit }) {
  const [open, setOpen] = useState(false);
  const [bar, setBar] = useState<Record<Unit, number>>({ lb: 45, kg: 20 });
  const total = Number(weight.replace(",", "."));
  const barWeight = bar[unit];

  let content: React.ReactNode = null;
  if (open) {
    if (!Number.isFinite(total) || total <= 0) {
      content = <p className="text-sm text-muted">Escribe un peso.</p>;
    } else if (total < barWeight) {
      content = <p className="text-sm text-muted">Es menos que la barra ({barWeight} {unit}).</p>;
    } else {
      let rest = (total - barWeight) / 2;
      const used: [number, number][] = [];
      for (const p of PLATES[unit]) {
        const n = Math.floor(rest / p + 1e-9);
        if (n > 0) {
          used.push([p, n]);
          rest -= n * p;
        }
      }
      const perSide = (total - barWeight) / 2;
      content = (
        <div className="flex flex-col gap-2 text-sm">
          {used.length === 0 ? (
            <p className="font-semibold">Solo la barra, sin discos.</p>
          ) : (
            <>
              <p className="text-muted">En cada lado de la barra pon:</p>
              <div className="flex flex-wrap gap-1.5">
                {used.flatMap(([p, n]) =>
                  Array.from({ length: n }, (_, k) => (
                    <span
                      key={`${p}-${k}`}
                      className="rounded-lg bg-accent px-2.5 py-1 font-display text-base font-bold text-bg"
                    >
                      {fmt(p)} {unit}
                    </span>
                  )),
                )}
              </div>
              <p className="text-muted">
                Barra {fmt(barWeight)} + {fmt(perSide)} por lado × 2 = {fmt(total)} {unit}
              </p>
            </>
          )}
          {rest > 0.01 && (
            <p className="text-warn">
              Con discos estándar faltan {fmt(Math.round(rest * 100) / 100)} {unit} por lado.
            </p>
          )}
        </div>
      );
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="h-11 rounded-xl bg-surface-2 text-sm font-semibold text-muted"
      >
        {open ? "Ocultar discos" : "¿Qué discos pongo?"}
      </button>
      {open && (
        <div className="flex flex-col gap-2 rounded-xl bg-surface-2 p-3">
          <label className="flex items-center gap-2 text-sm text-muted">
            Peso de la barra
            <select
              value={barWeight}
              onChange={(e) => setBar((b) => ({ ...b, [unit]: Number(e.target.value) }))}
              className="h-9 rounded-lg bg-surface px-2 text-text"
            >
              {BARS[unit].map((b) => (
                <option key={b} value={b}>
                  {b} {unit}
                </option>
              ))}
            </select>
          </label>
          {content}
        </div>
      )}
    </div>
  );
}

export function ExerciseNote({ exerciseId, initial }: { exerciseId: string; initial: string | null }) {
  const [note, setNote] = useState(initial ?? "");
  const [saved, setSaved] = useState(initial ?? "");
  const [open, setOpen] = useState(false);

  async function save() {
    if (note === saved) return;
    try {
      await updateExerciseNote(exerciseId, note);
      setSaved(note);
    } catch {
      // sin señal: se queda en pantalla y se reintenta al salir del campo otra vez
    }
  }

  if (!open && !note) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mb-1 self-start text-xs text-muted underline">
        + Nota del ejercicio
      </button>
    );
  }
  return (
    <textarea
      aria-label="Nota del ejercicio"
      value={note}
      onChange={(e) => setNote(e.target.value)}
      onBlur={save}
      rows={2}
      placeholder="Ej. ajuste del asiento, agarre, tempo…"
      className="mb-2 w-full resize-none rounded-xl bg-surface-2 px-3 py-2 text-sm text-text outline-none"
    />
  );
}
