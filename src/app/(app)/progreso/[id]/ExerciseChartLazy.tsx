"use client";

import dynamic from "next/dynamic";

// La librería de gráficas es pesada: solo se descarga en esta pantalla y después de que carga el resto.
export const ExerciseChartLazy = dynamic(() => import("./ExerciseChart").then((m) => m.ExerciseChart), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse rounded-xl bg-surface-2" aria-hidden="true" />,
});
