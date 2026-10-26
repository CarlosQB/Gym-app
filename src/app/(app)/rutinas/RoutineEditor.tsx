"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { deleteRoutine, saveRoutine, type RoutineInput } from "@/app/actions";
import type { Exercise } from "@/lib/types";

const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MUSCLES = [
  "Pecho",
  "Espalda",
  "Hombros",
  "Bíceps",
  "Tríceps",
  "Cuádriceps",
  "Isquiotibiales",
  "Glúteos",
  "Pantorrillas",
  "Abdomen",
  "Antebrazo",
  "Otro",
];
const NEW = "__new";

type Item = {
  key: number;
  exerciseId: string; // id del catálogo o NEW
  newName: string;
  muscleGroup: string;
  targetSets: string;
  repMin: string;
  repMax: string;
  rirMin: string;
  rirMax: string;
  restSeconds: string;
};

const input =
  "tabular h-11 w-full min-w-0 rounded-xl bg-surface-2 px-2 text-center font-display text-xl font-bold text-text outline-none";
const select = "h-12 w-full rounded-xl bg-surface-2 px-3 text-[15px] text-text";

let counter = 0;

function blank(): Item {
  counter += 1;
  return {
    key: counter,
    exerciseId: "",
    newName: "",
    muscleGroup: "Pecho",
    targetSets: "3",
    repMin: "8",
    repMax: "12",
    rirMin: "1",
    rirMax: "2",
    restSeconds: "120",
  };
}

function Num(props: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-center text-[11px] font-medium tracking-[0.04em] text-muted">
        {props.label}
      </span>
      <input
        inputMode="numeric"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value.replace(/\D/g, ""))}
        onFocus={(e) => e.target.select()}
        className={input}
      />
    </label>
  );
}

export function RoutineEditor({
  catalog,
  initial,
}: {
  catalog: Exercise[];
  initial: RoutineInput | null;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [weekday, setWeekday] = useState<string>(initial?.weekday ? String(initial.weekday) : "");
  const [items, setItems] = useState<Item[]>(() =>
    initial
      ? initial.items.map((it) => {
          counter += 1;
          return {
            key: counter,
            exerciseId: it.exerciseId ?? "",
            newName: "",
            muscleGroup: "Pecho",
            targetSets: String(it.targetSets),
            repMin: String(it.repMin),
            repMax: String(it.repMax),
            rirMin: String(it.rirMin),
            rirMax: String(it.rirMax),
            restSeconds: String(it.restSeconds),
          };
        })
      : [blank()],
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const patch = (key: number, p: Partial<Item>) =>
    setItems((list) => list.map((it) => (it.key === key ? { ...it, ...p } : it)));

  const move = (i: number, dir: -1 | 1) =>
    setItems((list) => {
      const j = i + dir;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  function submit() {
    setError(null);
    const payload: RoutineInput = {
      id: initial?.id ?? null,
      name,
      weekday: weekday ? Number(weekday) : null,
      items: items.map((it) => ({
        exerciseId: it.exerciseId && it.exerciseId !== NEW ? it.exerciseId : null,
        newName: it.exerciseId === NEW ? it.newName : "",
        muscleGroup: it.muscleGroup,
        targetSets: Number(it.targetSets),
        repMin: Number(it.repMin),
        repMax: Number(it.repMax),
        rirMin: Number(it.rirMin),
        rirMax: Number(it.rirMax),
        restSeconds: Number(it.restSeconds),
      })),
    };
    start(async () => {
      // Si todo sale bien la acción redirige; solo regresa algo cuando hay error.
      const res = await saveRoutine(payload);
      if (res && !res.ok) setError(res.error);
    });
  }

  function remove() {
    if (!initial?.id) return;
    if (!window.confirm("¿Borrar esta rutina? Tus sesiones ya guardadas se conservan.")) return;
    start(async () => {
      await deleteRoutine(initial.id!);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <Link href="/rutinas" className="text-sm text-muted">
          ← Mis rutinas
        </Link>
        <h1 className="font-display text-[34px] font-bold leading-[1.1]">
          {initial ? "Editar rutina" : "Nueva rutina"}
        </h1>
      </header>

      <section className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium tracking-[0.06em] text-muted">NOMBRE</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Pierna · Cuádriceps"
            className="h-12 rounded-xl bg-surface-2 px-3 text-[16px] text-text outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium tracking-[0.06em] text-muted">DÍA DE LA SEMANA</span>
          <select value={weekday} onChange={(e) => setWeekday(e.target.value)} className={select}>
            <option value="">Sin día fijo</option>
            {WEEKDAYS.map((d, i) => (
              <option key={d} value={i + 1}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </section>

      {items.map((it, i) => (
        <section key={it.key} className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold tracking-[0.08em] text-accent">EJERCICIO {i + 1}</p>
            <div className="flex gap-1 text-sm">
              <button
                type="button"
                aria-label="Subir"
                disabled={i === 0}
                onClick={() => move(i, -1)}
                className="h-9 w-9 rounded-lg bg-surface-2 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="Bajar"
                disabled={i === items.length - 1}
                onClick={() => move(i, 1)}
                className="h-9 w-9 rounded-lg bg-surface-2 disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                aria-label="Quitar ejercicio"
                onClick={() => setItems((l) => l.filter((x) => x.key !== it.key))}
                className="h-9 rounded-lg px-2 text-warn"
              >
                Quitar
              </button>
            </div>
          </div>

          <select
            aria-label="Ejercicio"
            value={it.exerciseId}
            onChange={(e) => patch(it.key, { exerciseId: e.target.value })}
            className={select}
          >
            <option value="">Elige un ejercicio…</option>
            {catalog.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name} · {ex.muscle_group}
              </option>
            ))}
            <option value={NEW}>+ Ejercicio nuevo…</option>
          </select>

          {it.exerciseId === NEW && (
            <div className="flex flex-col gap-2">
              <input
                aria-label="Nombre del ejercicio nuevo"
                value={it.newName}
                onChange={(e) => patch(it.key, { newName: e.target.value })}
                placeholder="Nombre del ejercicio"
                className="h-12 rounded-xl bg-surface-2 px-3 text-[16px] text-text outline-none"
              />
              <select
                aria-label="Grupo muscular"
                value={it.muscleGroup}
                onChange={(e) => patch(it.key, { muscleGroup: e.target.value })}
                className={select}
              >
                {MUSCLES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2">
            <Num label="SERIES" value={it.targetSets} onChange={(v) => patch(it.key, { targetSets: v })} />
            <Num label="REPS MÍN" value={it.repMin} onChange={(v) => patch(it.key, { repMin: v })} />
            <Num label="REPS MÁX" value={it.repMax} onChange={(v) => patch(it.key, { repMax: v })} />
          </div>
          <div className="flex gap-2">
            <Num label="RIR MÍN" value={it.rirMin} onChange={(v) => patch(it.key, { rirMin: v })} />
            <Num label="RIR MÁX" value={it.rirMax} onChange={(v) => patch(it.key, { rirMax: v })} />
            <Num label="DESCANSO (s)" value={it.restSeconds} onChange={(v) => patch(it.key, { restSeconds: v })} />
          </div>
        </section>
      ))}

      <button
        type="button"
        onClick={() => setItems((l) => [...l, blank()])}
        className="h-12 rounded-2xl bg-surface-2 font-semibold"
      >
        + Agregar ejercicio
      </button>

      {error && (
        <p role="alert" className="text-sm text-warn">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={pending}
        onClick={submit}
        className="h-14 rounded-2xl bg-accent text-lg font-semibold text-bg disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Guardar rutina"}
      </button>

      {initial?.id && (
        <button
          type="button"
          disabled={pending}
          onClick={remove}
          className="h-12 rounded-2xl border border-warn font-semibold text-warn disabled:opacity-50"
        >
          Borrar rutina
        </button>
      )}
    </div>
  );
}
