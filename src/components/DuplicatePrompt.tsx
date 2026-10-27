"use client";

import { useEffect, useState, useTransition } from "react";
import { mergeExercises } from "@/app/actions";
import { duplicatePairs, getNotDuplicates, isMarkedDifferent, markNotDuplicate, type ExerciseLite } from "@/lib/similar";

/** Pregunta, de uno en uno, si dos ejercicios con nombres parecidos son el mismo. */
export function DuplicatePrompt({ exercises }: { exercises: ExerciseLite[] }) {
  const [pairs, setPairs] = useState<[ExerciseLite, ExerciseLite][]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Los "no son el mismo" viven en el teléfono: se filtran ya en el navegador.
  useEffect(() => {
    const different = getNotDuplicates();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPairs(duplicatePairs(exercises).filter(([a, b]) => !isMarkedDifferent(different, a.id, b.id)));
  }, [exercises]);

  const pair = pairs[0];
  if (!pair) return msg ? <p role="status" className="text-sm text-muted">{msg}</p> : null;
  const [from, to] = pair;

  function next() {
    setPairs((p) => p.filter((x) => x !== pair && x[0].id !== from.id && x[1].id !== from.id));
  }

  function yes() {
    setMsg(null);
    start(async () => {
      const res = await mergeExercises(from.id, to.id);
      if (res.ok) {
        setMsg(`Listo: "${from.name}" ahora es parte de "${to.name}".`);
        next();
      } else {
        setMsg(res.error ?? "No se pudo unir.");
      }
    });
  }

  function no() {
    markNotDuplicate(from.id, to.id);
    setMsg(null);
    next();
  }

  return (
    <section aria-label="Posible ejercicio repetido" className="flex flex-col gap-3 rounded-2xl bg-surface p-4 ring-1 ring-[#3a4020]">
      <p className="text-xs font-semibold tracking-[0.08em] text-accent">¿EJERCICIO REPETIDO?</p>
      <p className="text-[15px]">
        <span className="font-semibold">“{from.name}”</span> y <span className="font-semibold">“{to.name}”</span>{" "}
        parecen el mismo ejercicio. ¿Lo son?
      </p>
      <p className="text-xs text-muted">
        Si dices que sí, las {from.sets} {from.sets === 1 ? "serie" : "series"} de “{from.name}” pasan a “{to.name}” y
        se junta su historial.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={yes}
          className="h-11 flex-1 rounded-xl bg-accent font-semibold text-bg disabled:opacity-60"
        >
          {pending ? "Uniendo…" : "Sí, unir"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={no}
          className="h-11 flex-1 rounded-xl bg-surface-2 font-semibold text-text disabled:opacity-60"
        >
          No, son distintos
        </button>
      </div>
      {msg && <p role="status" className="text-sm text-muted">{msg}</p>}
    </section>
  );
}
