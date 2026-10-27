"use client";

import { useMemo, useState, useTransition } from "react";
import { mergeExercises } from "@/app/actions";

export type ExerciseOption = { id: string; name: string; muscle: string; sets: number };

// Minúsculas y sin acentos, para comparar nombres ("Jalón" = "jalon").
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Pares que parecen el mismo ejercicio: un nombre contiene al otro (estimación). */
function likelyDuplicates(list: ExerciseOption[]): [ExerciseOption, ExerciseOption][] {
  const pairs: [ExerciseOption, ExerciseOption][] = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = norm(list[i].name);
      const b = norm(list[j].name);
      if (a === b || a.startsWith(b) || b.startsWith(a)) {
        // Se conserva el que tiene más series.
        pairs.push(list[i].sets >= list[j].sets ? [list[j], list[i]] : [list[i], list[j]]);
      }
    }
  }
  return pairs;
}

export function MergeExercises({ exercises }: { exercises: ExerciseOption[] }) {
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const suggestions = useMemo(() => likelyDuplicates(exercises), [exercises]);
  const byId = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  function merge(from: string, to: string) {
    const a = byId.get(from);
    const b = byId.get(to);
    if (!a || !b || a.id === b.id) {
      setMsg("Elige dos ejercicios distintos.");
      return;
    }
    if (
      !window.confirm(
        `Se pasan las ${a.sets} series y las rutinas de "${a.name}" a "${b.name}", y "${a.name}" se borra. ¿Unir?`,
      )
    )
      return;
    setMsg(null);
    start(async () => {
      const res = await mergeExercises(from, to);
      if (res.ok) {
        setFromId("");
        setToId("");
        setMsg(`Listo: "${a.name}" ahora es parte de "${b.name}".`);
      } else {
        setMsg(res.error ?? "No se pudo unir.");
      }
    });
  }

  const label = (e: ExerciseOption) => `${e.name} · ${e.sets} ${e.sets === 1 ? "serie" : "series"}`;

  return (
    <div className="flex flex-col gap-5">
      {suggestions.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold tracking-[0.08em] text-accent">POSIBLES REPETIDOS</h2>
          {suggestions.map(([a, b]) => (
            <div key={`${a.id}-${b.id}`} className="flex items-center gap-3 rounded-2xl bg-surface p-3">
              <p className="min-w-0 flex-1 text-sm">
                <span className="text-muted">{a.name}</span> → <span className="font-semibold">{b.name}</span>
              </p>
              <button
                type="button"
                disabled={pending}
                onClick={() => merge(a.id, b.id)}
                className="h-11 shrink-0 rounded-xl bg-accent px-4 text-sm font-semibold text-bg disabled:opacity-60"
              >
                Unir
              </button>
            </div>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-2.5 rounded-[20px] bg-surface p-3.5">
        <h2 className="text-xs font-semibold tracking-[0.08em] text-muted">UNIR A MANO</h2>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Este ejercicio (se borra)
          <select
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            className="h-11 rounded-xl bg-surface-2 px-3 text-text"
          >
            <option value="">Elige…</option>
            {exercises.map((e) => (
              <option key={e.id} value={e.id}>
                {label(e)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Se junta con (se queda)
          <select
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            className="h-11 rounded-xl bg-surface-2 px-3 text-text"
          >
            <option value="">Elige…</option>
            {exercises
              .filter((e) => e.id !== fromId)
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {label(e)}
                </option>
              ))}
          </select>
        </label>
        <button
          type="button"
          disabled={pending || !fromId || !toId}
          onClick={() => merge(fromId, toId)}
          className="h-12 rounded-xl bg-accent font-semibold text-bg disabled:opacity-60"
        >
          {pending ? "Uniendo…" : "Unir ejercicios"}
        </button>
      </section>

      {msg && (
        <p role="status" className="text-sm text-muted">
          {msg}
        </p>
      )}
    </div>
  );
}
