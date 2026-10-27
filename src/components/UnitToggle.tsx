"use client";

import { useTransition } from "react";
import { setUnit } from "@/app/actions";
import type { Unit } from "@/lib/units";

export function UnitToggle({ unit }: { unit: Unit }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      <span>Unidad de peso</span>
      <div className="flex rounded-full bg-surface-2 p-0.5" role="group" aria-label="Unidad de peso">
        {(["lb", "kg"] as const).map((u) => (
          <button
            key={u}
            type="button"
            disabled={pending}
            aria-pressed={unit === u}
            onClick={() => unit !== u && start(() => setUnit(u))}
            className={`h-11 rounded-full px-4 font-semibold ${
              unit === u ? "bg-accent text-bg" : "text-text"
            }`}
          >
            {u}
          </button>
        ))}
      </div>
    </div>
  );
}
