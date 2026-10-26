import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUnit } from "@/lib/unit.server";
import { toDisplay } from "@/lib/units";
import { localYmd } from "@/lib/dates";
import { BodyChart, type BodyPoint } from "./BodyChart";
import { BodyForm } from "./BodyForm";
import { DeleteMetricButton } from "./DeleteMetricButton";
import type { BodyMetric } from "@/lib/types";

export default async function CuerpoPage() {
  const supabase = await createClient();
  const unit = await getUnit();
  const { data } = await supabase
    .from("body_metrics")
    .select("id, measured_on, weight_kg, waist_cm, notes")
    .order("measured_on", { ascending: true })
    .limit(500);
  const rows = ((data ?? []) as BodyMetric[]).map((r) => ({
    ...r,
    weight_kg: r.weight_kg === null ? null : Number(r.weight_kg),
    waist_cm: r.waist_cm === null ? null : Number(r.waist_cm),
  }));

  const points: BodyPoint[] = rows.map((r) => ({
    label: r.measured_on.slice(5).replace("-", "/"),
    peso: r.weight_kg === null ? null : Math.round(toDisplay(r.weight_kg, unit) * 10) / 10,
    cintura: r.waist_cm,
  }));
  const hasWeight = points.some((p) => p.peso !== null);
  const hasWaist = points.some((p) => p.cintura !== null);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <Link href="/progreso" className="text-sm text-muted">
          ← Progreso
        </Link>
        <h1 className="font-display text-[38px] font-bold leading-[1.05]">Medidas corporales</h1>
      </header>

      <BodyForm unit={unit} today={localYmd(new Date())} />

      {rows.length > 1 && (hasWeight || hasWaist) && (
        <section className="rounded-2xl bg-surface p-4">
          <BodyChart data={points} unit={unit} showWeight={hasWeight} showWaist={hasWaist} />
        </section>
      )}

      <section className="rounded-2xl bg-surface p-4">
        {rows.length === 0 && <p className="text-sm text-muted">Todavía no hay registros.</p>}
        {[...rows].reverse().map((r) => (
          <div key={r.id} className="flex items-center justify-between border-t border-line py-2.5 first:border-t-0">
            <span className="text-[15px]">{r.measured_on.split("-").reverse().join("/")}</span>
            <span className="tabular flex items-center gap-3 text-sm text-muted">
              <span>
                {r.weight_kg !== null ? `${Math.round(toDisplay(r.weight_kg, unit) * 10) / 10} ${unit}` : "—"}
                {r.waist_cm !== null ? ` · cintura ${r.waist_cm} cm` : ""}
              </span>
              <DeleteMetricButton id={r.id} />
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}
