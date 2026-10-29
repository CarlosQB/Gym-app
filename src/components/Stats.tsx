// Piezas comunes de las pantallas de números: tarjetas con comparación y barras simples.

const nf = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

export function formatMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Tarjeta con un número y, si se da, el cambio contra el periodo anterior. */
export function StatTile({
  label,
  value,
  hint,
  delta,
  deltaLabel,
}: {
  label: string;
  value: string;
  hint?: string;
  /** Diferencia contra el periodo anterior (positivo = más). */
  delta?: number | null;
  /** Texto del cambio ya formateado; si falta se usa el número. */
  deltaLabel?: string;
}) {
  const showDelta = delta !== undefined && delta !== null;
  const up = (delta ?? 0) > 0;
  const down = (delta ?? 0) < 0;
  return (
    <div className="rounded-xl bg-bg p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="tabular font-display text-[26px] font-bold leading-tight">{value}</dd>
      {showDelta && (
        <dd className={`text-xs font-semibold ${up ? "text-accent" : down ? "text-warn" : "text-muted"}`}>
          {up ? "▲ " : down ? "▼ " : "= "}
          {deltaLabel ?? nf.format(Math.abs(delta!))}
          <span className="font-normal text-muted"> vs anterior</span>
        </dd>
      )}
      {hint && <dd className="text-xs text-muted">{hint}</dd>}
    </div>
  );
}

/** Barras verticales (p. ej. volumen por semana). La última se resalta. */
export function ColumnBars({
  data,
  label,
  format = (n) => nf.format(n),
}: {
  data: { label: string; value: number }[];
  label: string;
  format?: (n: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure>
      <div className="flex h-32 items-end gap-1.5" role="img" aria-label={label}>
        {data.map((d, i) => (
          <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="tabular text-[10px] text-muted">{d.value ? format(d.value) : ""}</span>
            <div
              className={`w-full rounded-t-md ${i === data.length - 1 ? "bg-accent" : "bg-surface-2"}`}
              style={{ height: `${Math.max(d.value ? 4 : 0, (d.value / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5">
        {data.map((d) => (
          <span key={d.label} className="flex-1 text-center text-[10px] text-muted">
            {d.label}
          </span>
        ))}
      </div>
      <figcaption className="sr-only">
        {data.map((d) => `${d.label}: ${format(d.value)}`).join(", ")}
      </figcaption>
    </figure>
  );
}

/** Barras horizontales por categoría (p. ej. series por músculo). */
export function RowBars({ data }: { data: { label: string; value: number; note?: string }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="flex flex-col gap-1.5">
      {data.map((d) => (
        <li key={d.label} className="grid grid-cols-[6rem_1fr_auto] items-center gap-2 text-sm">
          <span className="truncate text-muted">{d.label}</span>
          <span className="h-3 rounded-full bg-bg" aria-hidden>
            <span className="block h-3 rounded-full bg-accent" style={{ width: `${(d.value / max) * 100}%` }} />
          </span>
          <span className="tabular text-right">
            {d.value}
            {d.note && <span className="text-xs text-muted"> {d.note}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
