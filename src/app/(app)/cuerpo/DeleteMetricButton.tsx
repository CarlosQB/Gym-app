"use client";

import { useTransition } from "react";
import { deleteBodyMetric } from "@/app/actions";

export function DeleteMetricButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label="Borrar registro"
      onClick={() => {
        if (window.confirm("¿Borrar este registro?")) start(() => deleteBodyMetric(id));
      }}
      className="h-9 px-2 text-warn disabled:opacity-50"
    >
      Borrar
    </button>
  );
}
