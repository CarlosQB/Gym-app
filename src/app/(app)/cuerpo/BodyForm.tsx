"use client";

import { useRef, useState, useTransition } from "react";
import { addBodyMetric } from "@/app/actions";
import type { Unit } from "@/lib/units";

const field = "h-12 w-full min-w-0 rounded-xl bg-surface-2 px-3 text-[16px] text-text outline-none";

export function BodyForm({ unit, today }: { unit: Unit; today: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      ref={ref}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          try {
            const res = await addBodyMetric(fd);
            if (!res.ok) setError(res.error ?? "No se pudo guardar");
            else ref.current?.reset();
          } catch {
            setError("Necesitas conexión para guardar medidas");
          }
        });
      }}
      className="flex flex-col gap-3 rounded-2xl bg-surface p-4"
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium tracking-[0.06em] text-muted">FECHA</span>
        <input type="date" name="date" defaultValue={today} max={today} required className={field} />
      </label>
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-xs font-medium tracking-[0.06em] text-muted">PESO CORPORAL · {unit.toUpperCase()}</span>
          <input name="weight" inputMode="decimal" placeholder="Opcional" className={field} />
        </label>
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-xs font-medium tracking-[0.06em] text-muted">CINTURA · CM</span>
          <input name="waist" inputMode="decimal" placeholder="Opcional" className={field} />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-sm text-warn">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-2xl bg-accent text-[16px] font-semibold text-bg disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Guardar medida"}
      </button>
    </form>
  );
}
