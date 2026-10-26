"use client";

import { useState, useTransition } from "react";
import { deleteSet, updateSet } from "@/app/actions";
import type { SetKind } from "@/lib/types";

export type EditableSet = {
  id: string;
  exercise_id: string;
  set_number: number;
  kind: SetKind;
  weight_kg: number;
  reps: number;
  rir: number | null;
  is_pr: boolean;
};

const KINDS: { value: SetKind; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "warmup", label: "Calent." },
  { value: "dropset", label: "Dropset" },
];

const field =
  "tabular h-11 w-full min-w-0 rounded-xl bg-surface-2 px-2 text-center font-display text-xl font-bold text-text outline-none";

function Row({ workoutId, s, n }: { workoutId: string; s: EditableSet; n: number }) {
  const [weight, setWeight] = useState(String(s.weight_kg));
  const [reps, setReps] = useState(String(s.reps));
  const [rir, setRir] = useState(s.rir === null ? "" : String(s.rir));
  const [kind, setKind] = useState<SetKind>(s.kind);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const dirty =
    Number(weight.replace(",", ".")) !== s.weight_kg ||
    Number(reps) !== s.reps ||
    (rir === "" ? null : Number(rir)) !== s.rir ||
    kind !== s.kind;

  function save() {
    setMsg(null);
    start(async () => {
      const res = await updateSet({
        setId: s.id,
        workoutId,
        kind,
        weightKg: Number(weight.replace(",", ".")),
        reps: Number(reps),
        rir: rir === "" ? null : Number(rir),
      });
      setMsg(res.ok ? "Guardado" : (res.error ?? "Error"));
    });
  }

  function remove() {
    if (!window.confirm(`¿Borrar la serie ${n}?`)) return;
    start(async () => {
      await deleteSet(s.id, workoutId);
    });
  }

  return (
    <li className="flex flex-col gap-2 border-t border-line py-3">
      <div className="flex items-center gap-2">
        <span className="w-5 text-sm text-muted">{n}</span>
        <label className="flex-1">
          <span className="sr-only">Peso (kg)</span>
          <input
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            onFocus={(e) => e.target.select()}
            className={field}
          />
        </label>
        <span className="text-xs text-muted">kg</span>
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
      <div className="flex items-center gap-2 pl-7">
        <select
          aria-label="Tipo de serie"
          value={kind}
          onChange={(e) => setKind(e.target.value as SetKind)}
          className="h-10 rounded-xl bg-surface-2 px-2 text-sm text-text"
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
            className="h-10 rounded-xl bg-accent px-4 text-sm font-semibold text-bg disabled:opacity-50"
          >
            Guardar
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={remove}
          className="h-10 rounded-xl px-3 text-sm text-warn disabled:opacity-50"
        >
          Borrar
        </button>
      </div>
    </li>
  );
}

export function EditSets({ workoutId, sets }: { workoutId: string; sets: EditableSet[] }) {
  return (
    <ul>
      {sets.map((s, i) => (
        <Row key={s.id} workoutId={workoutId} s={s} n={i + 1} />
      ))}
    </ul>
  );
}
