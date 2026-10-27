"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { deleteRoutine, saveRoutine, type RoutineInput } from "@/app/actions";
import type { Exercise } from "@/lib/types";
import { isSimilar, norm } from "@/lib/similar";
import { Spinner } from "@/components/Spinner";

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
  "Aductores",
  "Abductores",
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
  withPrevious: boolean; // va en el mismo bloque que el ejercicio anterior
  altId: string; // variante: "" = ninguna, NEW = crear, o id del catálogo
  altNewName: string;
  altMuscleGroup: string;
};

// Para los "press": propone la variante contraria (con barra <-> con mancuernas).
function pressVariantName(name: string): string | null {
  if (!/press/i.test(name)) return null;
  if (/mancuernas?/i.test(name)) return name.replace(/mancuernas?/i, "barra");
  if (/barra/i.test(name)) return name.replace(/barra/i, "mancuernas");
  return `${name} con mancuernas`;
}

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
    withPrevious: false,
    altId: "",
    altNewName: "",
    altMuscleGroup: "Pecho",
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

/** Si el nombre nuevo se parece a uno que ya existe, pregunta si es el mismo. */
function SameAsPrompt({
  name,
  catalog,
  onUse,
}: {
  name: string;
  catalog: Exercise[];
  onUse: (ex: Exercise) => void;
}) {
  const [dismissed, setDismissed] = useState<string | null>(null);
  if (norm(name).length < 4 || dismissed === norm(name)) return null;
  const match = catalog.find((ex) => isSimilar(ex.name, name));
  if (!match) return null;
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-accent-dim p-3 text-sm ring-1 ring-[#3a4020]">
      <p>
        Ya tienes <span className="font-semibold">“{match.name}”</span>. ¿Es el mismo ejercicio?
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onUse(match)}
          className="h-11 flex-1 rounded-xl bg-accent font-semibold text-bg"
        >
          Sí, usar ese
        </button>
        <button
          type="button"
          onClick={() => setDismissed(norm(name))}
          className="h-11 flex-1 rounded-xl bg-surface-2 font-semibold text-text"
        >
          No, es otro
        </button>
      </div>
    </div>
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
            withPrevious: it.withPrevious,
            altId: it.altExerciseId ?? "",
            altNewName: "",
            altMuscleGroup: "Pecho",
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
        withPrevious: it.withPrevious,
        altExerciseId: it.altId && it.altId !== NEW ? it.altId : null,
        altNewName: it.altId === NEW ? it.altNewName : "",
        altMuscleGroup: it.altMuscleGroup,
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
            <p className="text-xs font-semibold tracking-[0.08em] text-accent">EJERCICIO {i + 1}{it.withPrevious && i > 0 ? " · DESPUÉS DEL ANTERIOR" : ""}</p>
            <div className="flex gap-1 text-sm">
              <button
                type="button"
                aria-label="Subir"
                disabled={i === 0}
                onClick={() => move(i, -1)}
                className="h-11 w-11 rounded-lg bg-surface-2 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="Bajar"
                disabled={i === items.length - 1}
                onClick={() => move(i, 1)}
                className="h-11 w-11 rounded-lg bg-surface-2 disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                aria-label="Quitar ejercicio"
                onClick={() => setItems((l) => l.filter((x) => x.key !== it.key))}
                className="h-11 rounded-lg px-3 text-warn"
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
              <SameAsPrompt
                name={it.newName}
                catalog={catalog}
                onUse={(ex) => patch(it.key, { exerciseId: ex.id, newName: "" })}
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

          <div className="flex flex-col gap-2 border-t border-line pt-3">
            <p className="text-xs font-medium tracking-[0.06em] text-muted">
              VARIANTE (OPCIONAL) · SE ELIGE AL ENTRENAR
            </p>
            <select
              aria-label="Variante del ejercicio"
              value={it.altId}
              onChange={(e) => patch(it.key, { altId: e.target.value })}
              className={select}
            >
              <option value="">Sin variante</option>
              {catalog
                .filter((ex) => ex.id !== it.exerciseId)
                .map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name} · {ex.muscle_group}
                  </option>
                ))}
              <option value={NEW}>+ Variante nueva…</option>
            </select>

            {(() => {
              const main = catalog.find((ex) => ex.id === it.exerciseId);
              const name = main?.name ?? (it.exerciseId === NEW ? it.newName : "");
              const suggestion = it.altId ? null : pressVariantName(name);
              if (!suggestion) return null;
              const existing = catalog.find((ex) => ex.name.toLowerCase() === suggestion.toLowerCase());
              return (
                <button
                  type="button"
                  onClick={() =>
                    patch(
                      it.key,
                      existing
                        ? { altId: existing.id }
                        : { altId: NEW, altNewName: suggestion, altMuscleGroup: main?.muscle_group ?? it.muscleGroup },
                    )
                  }
                  className="min-h-11 rounded-xl bg-accent-dim px-3 text-left text-sm font-semibold text-accent ring-1 ring-[#3a4020]"
                >
                  + Agregar variante: {suggestion}
                </button>
              );
            })()}

            {it.altId === NEW && (
              <>
                <input
                  aria-label="Nombre de la variante"
                  value={it.altNewName}
                  onChange={(e) => patch(it.key, { altNewName: e.target.value })}
                  placeholder="Nombre de la variante"
                  className="h-12 rounded-xl bg-surface-2 px-3 text-[16px] text-text outline-none"
                />
                <SameAsPrompt
                  name={it.altNewName}
                  catalog={catalog.filter((ex) => ex.id !== it.exerciseId)}
                  onUse={(ex) => patch(it.key, { altId: ex.id, altNewName: "" })}
                />
                <select
                  aria-label="Grupo muscular de la variante"
                  value={it.altMuscleGroup}
                  onChange={(e) => patch(it.key, { altMuscleGroup: e.target.value })}
                  className={select}
                >
                  {MUSCLES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>

          {i > 0 && (
            <label className="flex items-center gap-2 border-t border-line pt-3 text-sm">
              <input
                type="checkbox"
                checked={it.withPrevious}
                onChange={(e) => patch(it.key, { withPrevious: e.target.checked })}
                className="h-5 w-5 accent-[#cdf545]"
              />
              Va después del anterior, en el mismo bloque
            </label>
          )}
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
        {pending ? (
            <span className="inline-flex items-center gap-2">
              <Spinner />
              Guardando…
            </span>
          ) : (
            "Guardar rutina"
          )}
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
