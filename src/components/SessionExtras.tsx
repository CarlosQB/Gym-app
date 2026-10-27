"use client";

import { useState } from "react";
import { updateExerciseNote } from "@/app/actions";
import type { Suggestion } from "@/lib/progression";
import type { Unit } from "@/lib/units";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2))));

export function SuggestionChip({
  suggestion,
  last,
  targetSets,
  unit,
  onUse,
}: {
  suggestion: Suggestion;
  last?: { weight: number; reps: number; rir: number | null };
  targetSets: number;
  unit: Unit;
  onUse: (s: Suggestion) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onUse(suggestion)}
      className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-accent-dim px-3 py-2 text-left ring-1 ring-[#3a4020]"
    >
      <span className="text-[13px]">
        {last && (
          <span className="block text-muted">
            La vez pasada: {fmt(last.weight)} {unit} × {last.reps}
            {last.rir !== null ? ` @ RIR ${last.rir}` : ""}
          </span>
        )}
        <span className="font-semibold text-accent">
          Hoy: {targetSets} {targetSets === 1 ? "serie" : "series"} de {fmt(suggestion.weight)} {unit} × {suggestion.reps}
        </span>
        <span className="block text-muted">{suggestion.text} (estimación)</span>
      </span>
      <span className="text-sm font-semibold text-accent">Usar</span>
    </button>
  );
}

export function NoHistoryChip() {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2 text-[13px] text-muted">
      Primera vez con este ejercicio: aún no hay recomendación. La próxima sesión te diré qué peso y reps intentar.
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
