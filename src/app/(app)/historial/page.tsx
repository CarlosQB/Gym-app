import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDayMonth, minutesBetween } from "@/lib/dates";

type Row = {
  id: string;
  name: string;
  started_at: string;
  ended_at: string | null;
  sets: { count: number }[];
};

export const metadata = { title: "Historial" };

export default async function HistorialPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workouts")
    .select("id, name, started_at, ended_at, sets(count)")
    .order("started_at", { ascending: false })
    .limit(60);
  const workouts = (data ?? []) as Row[];

  return (
    <div className="flex flex-col gap-5">
      <header>
        <Link href="/entrenar" className="text-sm text-muted">
          ← Entrenar
        </Link>
        <h1 className="font-display text-[38px] font-bold leading-[1.05]">Historial</h1>
        <p className="text-sm text-muted">Toca una sesión para editar sus series o borrarla.</p>
      </header>

      {workouts.length === 0 ? (
        <p className="text-muted">Todavía no hay sesiones.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {workouts.map((w) => (
            <li key={w.id}>
              <Link
                href={`/historial/${w.id}`}
                className="flex items-center justify-between rounded-2xl bg-surface p-4"
              >
                <div>
                  <p className="text-xs text-muted">{formatDayMonth(new Date(w.started_at))}</p>
                  <p className="font-display text-2xl font-bold leading-tight">{w.name}</p>
                </div>
                <div className="text-right text-sm text-muted">
                  <p>{w.sets?.[0]?.count ?? 0} series</p>
                  <p>
                    {w.ended_at
                      ? `${minutesBetween(w.started_at, w.ended_at)} min`
                      : "sin terminar"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
