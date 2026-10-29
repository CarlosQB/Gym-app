"use client";

import { useState, useTransition } from "react";
import { deleteSet, insertSetAfter, updateSet } from "@/app/actions";
import type { SetKind } from "@/lib/types";
import { fromDisplay, stepFor, toDisplay, type Unit } from "@/lib/units";
import { Spinner } from "@/components/Spinner";

export type EditableSet = {
  id: string;
  exercise_id: string;
  set_number: number;
  kind: SetKind;
  weight_kg: number;
  reps: number;
  rir: number | null;
  is_pr: boolean;
  note?: string | null;
};

const KINDS: { value: SetKind; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "warmup", label: "Calent." },
  { value: "dropset", label: "Dropset" },
];

const field =
  "tabular h-11 w-full min-w-0 rounded-xl bg-surface-2 px-2 text-center font-display text-xl font-bold text-text outline-none";

function Row({ workoutId, s, n, unit }: { workoutId: string; s: EditableSet; n: number; unit: Unit }) {
  const shown = toDisplay(s.weight_kg, unit);
  const [weight, setWeight] = useState(String(shown));
  const [reps, setReps] = useState(String(s.reps));
  const [rir, setRir] = useState(s.rir === null ? "" : String(s.rir));
  const [kind, setKind] = useState<SetKind>(s.kind);
  const [note, setNote] = useState(s.note ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();

  const dirty =
    Number(weight.replace(",", ".")) !== shown ||
    Number(reps) !== s.reps ||
    (rir === "" ? null : Number(rir)) !== s.rir ||
    kind !== s.kind ||
    note.trim() !== (s.note ?? "");

  function save() {
    setMsg(null);
    start(async () => {
      const res = await updateSet({
        setId: s.id,
        workoutId,
        kind,
        weightKg: fromDisplay(Number(weight.replace(",", ".")), unit),
        reps: Number(reps),
        rir: rir === "" ? null : Number(rir),
        note,
      });
      setMsg(res.ok ? "Guardado" : (res.error ?? "Error"));
    });
  }

  function remove() {
    if (!window.confirm(`¿Borrar la serie ${n}?`)) return;
    start(async () => {
      try {
        await deleteSet(s.id, workoutId);
      } catch {
        setMsg("No se pudo borrar. Revisa tu conexión.");
      }
    });
  }

  return (
    <li className="flex flex-col gap-2 border-t border-line py-3">
      <div className="flex items-center gap-2">
        <span className="w-5 text-sm text-muted">{n}</span>
        <label className="flex-1">
          <span className="sr-only">Peso ({unit})</span>
          <input
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            onFocus={(e) => e.target.select()}
            className={field}
          />
        </label>
        <span className="text-xs text-muted">{unit}</span>
        <label className="w-16">
          <span className="sr-only">Repeticiones</span>
          <input
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            onFocus={(e) => e.target.select()}
            className={field}
          />
        </label>
        <span className="text-xs text-muted">reps</span>
        <label className="w-14">
          <span className="sr-only">RIR</span>
          <input
            inputMode="numeric"
            placeholder="RIR"
            value={rir}
            onChange={(e) => setRir(e.target.value)}
            onFocus={(e) => e.target.select()}
            className={field}
          />
        </label>
      </div>
      <input
        aria-label="Nota de la serie"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={300}
        placeholder="Nota (opcional)"
        className="ml-7 h-10 rounded-xl bg-surface-2 px-3 text-sm text-text outline-none"
      />
      <div className="flex items-center gap-2 pl-7">
        <select
          aria-label="Tipo de serie"
          value={kind}
          onChange={(e) => setKind(e.target.value as SetKind)}
          className="h-11 rounded-xl bg-surface-2 px-2 text-sm text-text"
        >
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
        {s.is_pr && <span className="text-xs font-semibold text-accent">PR</span>}
        <span className="flex-1 text-xs text-muted">{msg}</span>
        {dirty && (
          <button
            type="button"
            disabled={pending}
            onClick={save}
            className="h-11 rounded-xl bg-accent px-4 text-sm font-semibold text-bg disabled:opacity-50"
          >
            Guardar
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={remove}
          className="h-11 rounded-xl px-3 text-sm text-warn disabled:opacity-50"
        >
          Borrar
        </button>
      </div>
      {s.kind !== "warmup" && !adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="ml-7 self-start text-xs font-semibold text-accent underline"
        >
          + Dropset después de esta serie
        </button>
      )}
      {adding && <AddAfter workoutId={workoutId} after={s} unit={unit} onDone={() => setAdding(false)} />}
    </li>
  );
}

/** Formulario corto para agregar un dropset (u otra serie) justo después de una serie guardada. */
function AddAfter({
  workoutId,
  after,
  unit,
  onDone,
}: {
  workoutId: string;
  after: EditableSet;
  unit: Unit;
  onDone: () => void;
}) {
  const step = stepFor(unit);
  const base = toDisplay(after.weight_kg, unit);
  const [weight, setWeight] = useState(String(Math.max(step, Math.round((base * 0.8) / step) * step)));
  const [reps, setReps] = useState(String(after.reps));
  const [kind, setKind] = useState<SetKind>("dropset");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setMsg(null);
    start(async () => {
      const res = await insertSetAfter({
        workoutId,
        afterSetId: after.id,
        kind,
        weightKg: fromDisplay(Number(weight.replace(",", ".")), unit),
        reps: Number(reps),
        rir: kind === "warmup" ? null : 0,
      });
      if (res.ok) onDone();
      else setMsg(res.error ?? "No se pudo agregar.");
    });
  }

  return (
    <div className="ml-7 flex flex-col gap-2 rounded-xl bg-surface-2/60 p-2">
      <div className="flex items-center gap-2">
        <select
          aria-label="Tipo de la serie nueva"
          value={kind}
          onChange={(e) => setKind(e.target.value as SetKind)}
          className="h-11 rounded-xl bg-surface-2 px-2 text-sm text-text"
        >
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
        <label className="flex-1">
          <span className="sr-only">Peso ({unit})</span>
          <input
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            onFocus={(e) => e.target.select()}
            className={field}
          />
        </label>
        <span className="text-xs text-muted">{unit}</span>
        <label className="w-16">
          <span className="sr-only">Repeticiones</span>
          <input
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            onFocus={(e) => e.target.select()}
            className={field}
          />
        </label>
        <span className="text-xs text-muted">reps</span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="h-11 flex-1 rounded-xl bg-accent text-sm font-semibold text-bg disabled:opacity-60"
        >
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <Spinner />
              Agregando…
            </span>
          ) : (
            "Agregar"
          )}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="h-11 rounded-xl bg-surface-2 px-4 text-sm font-semibold text-muted"
        >
          Cancelar
        </button>
      </div>
      {msg && (
        <p role="alert" className="text-sm text-warn">
          {msg}
        </p>
      )}
    </div>
  );
}

export function EditSets({ workoutId, sets, unit }: { workoutId: string; sets: EditableSet[]; unit: Unit }) {
  return (
    <ul>
      {sets.map((s, i) => (
        <Row key={`${s.id}-${unit}`} workoutId={workoutId} s={s} n={i + 1} unit={unit} />
      ))}
    </ul>
  );
}
