"use client";

import { useState } from "react";
import { updateExercise, updateExerciseNote } from "@/app/actions";
import type { Suggestion } from "@/lib/progression";
import type { Unit } from "@/lib/units";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2))));

export function SuggestionChip({
  suggestion,
  unit,
  onUse,
}: {
  suggestion: Suggestion;
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
        <span className="font-semibold text-accent">
          Hoy intenta {fmt(suggestion.weight)} {unit} × {suggestion.reps}
        </span>
        <span className="block text-muted">{suggestion.text} (estimación)</span>
      </span>
      <span className="text-sm font-semibold text-accent">Usar</span>
    </button>
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
      content = (
        <div className="flex flex-col gap-1 text-sm">
          <p>
            <span className="text-muted">Por lado: </span>
            <span className="font-semibold">
              {used.length === 0 ? "solo la barra" : used.map(([p, n]) => (n > 1 ? `${n}×${fmt(p)}` : fmt(p))).join(" + ")}
            </span>
          </p>
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
        {open ? "Ocultar discos" : "Calcular discos"}
      </button>
      {open && (
        <div className="flex flex-col gap-2 rounded-xl bg-surface-2 p-3">
          <label className="flex items-center gap-2 text-sm text-muted">
            Barra
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

const YT = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/))([\w-]{11})/;

export function TechniqueVideo({ exerciseId, initial }: { exerciseId: string; initial: string | null }) {
  const [url, setUrl] = useState(initial ?? "");
  const [draft, setDraft] = useState(initial ?? "");
  const [editing, setEditing] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    try {
      const res = await updateExercise({ id: exerciseId, videoUrl: draft });
      if (!res.ok) {
        setError(res.error ?? "No se pudo guardar");
        return;
      }
      setUrl(draft.trim());
      setEditing(false);
    } catch {
      setError("Necesitas conexión para guardar el enlace");
    }
  }

  const yt = url ? YT.exec(url)?.[1] : undefined;

  if (editing) {
    return (
      <div className="mb-2 flex flex-col gap-2">
        <input
          aria-label="Enlace del video de técnica"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          inputMode="url"
          placeholder="https://youtube.com/watch?v=…"
          className="h-11 rounded-xl bg-surface-2 px-3 text-sm text-text outline-none"
        />
        {error && <p className="text-sm text-warn">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={save} className="h-10 flex-1 rounded-xl bg-accent text-sm font-semibold text-bg">
            Guardar enlace
          </button>
          <button type="button" onClick={() => setEditing(false)} className="h-10 rounded-xl px-4 text-sm text-muted">
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (!url) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="mb-1 self-start text-xs text-muted underline">
        + Video de técnica
      </button>
    );
  }

  return (
    <div className="mb-2 flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {yt ? (
          <button
            type="button"
            aria-expanded={show}
            onClick={() => setShow((v) => !v)}
            className="h-9 rounded-full bg-surface-2 px-3 text-[13px] font-semibold text-accent"
          >
            {show ? "Ocultar técnica" : "Ver técnica"}
          </button>
        ) : (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 items-center rounded-full bg-surface-2 px-3 text-[13px] font-semibold text-accent"
          >
            Ver técnica ↗
          </a>
        )}
        <button type="button" onClick={() => setEditing(true)} className="text-xs text-muted underline">
          Cambiar enlace
        </button>
      </div>
      {show && yt && (
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-surface-2">
          <iframe
            title="Video de técnica"
            src={`https://www.youtube-nocookie.com/embed/${yt}`}
            className="h-full w-full"
            allow="encrypted-media; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      )}
    </div>
  );
}
