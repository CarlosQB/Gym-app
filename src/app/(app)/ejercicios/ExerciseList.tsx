/* eslint-disable @next/next/no-img-element -- fotos externas del catálogo, sin optimizar */
"use client";

import { useState, useTransition } from "react";
import { renameExercise } from "@/app/actions";
import { TechniquePicker } from "@/components/Technique";
import { techniqueImages } from "@/lib/technique";
import type { ExerciseOption } from "./MergeExercises";
import { Spinner } from "@/components/Spinner";

function Row({ e }: { e: ExerciseOption }) {
  const [mode, setMode] = useState<"view" | "rename" | "image">("view");
  const [name, setName] = useState(e.name);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setMsg(null);
    start(async () => {
      const res = await renameExercise(e.id, name);
      if (res.ok) setMode("view");
      else setMsg(res.error ?? "No se pudo guardar.");
    });
  }

  if (mode === "view")
    return (
      <li className="flex min-h-14 items-center gap-2 border-t border-line py-1.5 first:border-t-0">
        {e.image ? (
          <img
            src={techniqueImages(e.image)[0]}
            alt=""
            loading="lazy"
            className="h-11 w-14 shrink-0 rounded-lg bg-white object-contain"
          />
        ) : null}
        <p className="min-w-0 flex-1 text-[15px]">
          {e.name}
          <span className="block text-xs text-muted">
            {e.muscle} · {e.sets} {e.sets === 1 ? "serie" : "series"}
          </span>
        </p>
        <button
          type="button"
          onClick={() => setMode("image")}
          aria-label={`${e.image ? "Cambiar" : "Elegir"} imagen de técnica de ${e.name}`}
          className="h-11 shrink-0 rounded-xl bg-surface-2 px-3 text-sm font-semibold text-text"
        >
          Imagen
        </button>
        <button
          type="button"
          onClick={() => setMode("rename")}
          aria-label={`Cambiar nombre de ${e.name}`}
          className="h-11 shrink-0 rounded-xl bg-surface-2 px-3 text-sm font-semibold text-text"
        >
          Nombre
        </button>
      </li>
    );

  if (mode === "image")
    return (
      <li className="flex flex-col gap-2 border-t border-line py-2 first:border-t-0">
        <p className="text-[15px] font-semibold">Imagen de técnica: {e.name}</p>
        <TechniquePicker exercise={e} onDone={() => setMode("view")} />
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
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <Spinner />
              Guardando…
            </span>
          ) : (
            "Guardar"
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setName(e.name);
            setMsg(null);
            setMode("view");
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

export function ExerciseList({ exercises }: { exercises: ExerciseOption[] }) {
  return (
    <section className="flex flex-col gap-1 rounded-[20px] bg-surface p-3.5">
      <h2 className="text-xs font-semibold tracking-[0.08em] text-muted">TUS EJERCICIOS</h2>
      <p className="text-sm text-muted">
        Elige la imagen de técnica (inicio y final) o cambia el nombre. El historial no cambia.
      </p>
      <ul className="mt-1">
        {exercises.map((e) => (
          <Row key={`${e.id}-${e.name}-${e.image ?? ""}`} e={e} />
        ))}
      </ul>
    </section>
  );
}
