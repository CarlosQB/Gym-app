"use client";

import { useState, useTransition } from "react";
import { renameExercise } from "@/app/actions";
import type { ExerciseOption } from "./MergeExercises";

function Row({ e }: { e: ExerciseOption }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(e.name);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setMsg(null);
    start(async () => {
      const res = await renameExercise(e.id, name);
      if (res.ok) setEditing(false);
      else setMsg(res.error ?? "No se pudo guardar.");
    });
  }

  if (!editing)
    return (
      <li className="flex min-h-12 items-center gap-3 border-t border-line py-1.5 first:border-t-0">
        <p className="min-w-0 flex-1 text-[15px]">
          {e.name}
          <span className="block text-xs text-muted">
            {e.muscle} · {e.sets} {e.sets === 1 ? "serie" : "series"}
          </span>
        </p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Cambiar nombre de ${e.name}`}
          className="h-11 shrink-0 rounded-xl bg-surface-2 px-3 text-sm font-semibold text-text"
        >
          Renombrar
        </button>
      </li>
    );

  return (
    <li className="flex flex-col gap-2 border-t border-line py-2 first:border-t-0">
      <label className="flex flex-col gap-1 text-sm text-muted">
        Nuevo nombre
        <input
          autoFocus
          value={name}
          maxLength={80}
          onChange={(ev) => setName(ev.target.value)}
          onKeyDown={(ev) => ev.key === "Enter" && save()}
          className="h-11 rounded-xl bg-surface-2 px-3 text-[15px] text-text outline-none"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending || !name.trim() || name.trim() === e.name}
          onClick={save}
          className="h-11 flex-1 rounded-xl bg-accent font-semibold text-bg disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setName(e.name);
            setMsg(null);
            setEditing(false);
          }}
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
    </li>
  );
}

export function RenameExercises({
  exercises,
}: {
  exercises: ExerciseOption[];
}) {
  return (
    <section className="flex flex-col gap-1 rounded-[20px] bg-surface p-3.5">
      <h2 className="text-xs font-semibold tracking-[0.08em] text-muted">
        CAMBIAR NOMBRE
      </h2>
      <p className="text-sm text-muted">
        El historial no cambia, solo cómo se llama en rutinas y sesiones.
      </p>
      <ul className="mt-1">
        {exercises.map((e) => (
          <Row key={`${e.id}-${e.name}`} e={e} />
        ))}
      </ul>
    </section>
  );
}
