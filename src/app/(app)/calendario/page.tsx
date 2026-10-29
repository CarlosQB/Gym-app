import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { addDays, formatDayMonth, localYmd, minutesBetween, streakWeeks } from "@/lib/dates";
import { getUnit } from "@/lib/unit.server";
import { toDisplay } from "@/lib/units";
import { formatMinutes, RowBars, StatTile } from "@/components/Stats";

const DAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];
const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

type W = { id: string; name: string; started_at: string; ended_at: string | null };
type S = { workout_id: string; kind: string; weight_kg: number; reps: number; exercise: { muscle_group: string } | null };

const nf = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
const n1 = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const mins = (ws: W[]) => ws.reduce((a, w) => a + (w.ended_at ? minutesBetween(w.started_at, w.ended_at) : 0), 0);

function shiftMonth(y: number, m: number, d: number) {
  const t = new Date(Date.UTC(y, m - 1 + d, 1));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`;
}

export const metadata = { title: "Calendario" };

export default async function CalendarioPage(props: PageProps<"/calendario">) {
  const sp = await props.searchParams;
  const raw = typeof sp.m === "string" ? sp.m : "";
  const today = localYmd(new Date());
  const match = /^(\d{4})-(\d{2})$/.exec(raw);
  const [y, m] = match && Number(match[2]) >= 1 && Number(match[2]) <= 12
    ? [Number(match[1]), Number(match[2])]
    : [Number(today.slice(0, 4)), Number(today.slice(5, 7))];

  const first = `${y}-${String(m).padStart(2, "0")}-01`;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const offset = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // lunes = 0

  const supabase = await createClient();
  const unit = await getUnit();
  const prevMonth = shiftMonth(y, m, -1);
  const from = new Date(`${addDays(`${prevMonth}-01`, -1)}T00:00:00Z`).toISOString();
  const to = new Date(`${addDays(first, daysInMonth + 1)}T00:00:00Z`).toISOString();
  const since = new Date(`${addDays(today, -400)}T00:00:00Z`).toISOString();

  const [monthRes, allRes] = await Promise.all([
    supabase.from("workouts").select("id, name, started_at, ended_at").gte("started_at", from).lt("started_at", to).order("started_at"),
    supabase.from("workouts").select("started_at").not("ended_at", "is", null).gte("started_at", since),
  ]);

  const all = (monthRes.data ?? []) as W[];
  const inMonth = all.filter((w) => localYmd(new Date(w.started_at)).startsWith(first.slice(0, 7)));
  const inPrev = all.filter((w) => localYmd(new Date(w.started_at)).startsWith(prevMonth));

  // Series del mes: volumen y reparto por músculo.
  const { data: sData } = inMonth.length
    ? await supabase
        .from("sets")
        .select("workout_id, kind, weight_kg, reps, exercise:exercises(muscle_group)")
        .in(
          "workout_id",
          inMonth.map((w) => w.id),
        )
        .limit(5000)
    : { data: [] };
  const sets = (sData ?? []) as unknown as S[];
  const workSets = sets.filter((x) => x.kind === "normal");
  const volume = sets.filter((x) => x.kind !== "warmup").reduce((a, x) => a + Number(x.weight_kg) * x.reps, 0);
  const byMuscle = new Map<string, number>();
  for (const x of workSets) {
    const g = x.exercise?.muscle_group ?? "Otro";
    byMuscle.set(g, (byMuscle.get(g) ?? 0) + 1);
  }
  const muscles = [...byMuscle.entries()].sort((a, b) => b[1] - a[1]);
  const routines = new Map<string, number>();
  for (const w of inMonth) routines.set(w.name, (routines.get(w.name) ?? 0) + 1);
  const topRoutines = [...routines.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);

  const minutes = mins(inMonth);
  const finished = inMonth.filter((w) => w.ended_at).length;
  const isCurrent = first.slice(0, 7) === today.slice(0, 7);
  const daysSoFar = isCurrent ? Number(today.slice(8)) : daysInMonth;
  const perWeek = (inMonth.length / daysSoFar) * 7;
  const byDay = new Map<number, W[]>();
  for (const w of inMonth) {
    const d = Number(localYmd(new Date(w.started_at)).slice(8));
    byDay.set(d, [...(byDay.get(d) ?? []), w]);
  }
  const streak = streakWeeks((allRes.data ?? []).map((w) => new Date(w.started_at)));

  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-end justify-between">
        <h1 className="font-display text-[38px] font-bold leading-[1.05]">Calendario</h1>
        {streak > 0 && (
          <span className="flex h-8 items-center rounded-full border border-[#3a4020] bg-accent-dim px-3 text-[13px] font-semibold text-accent">
            Racha · {streak} {streak === 1 ? "semana" : "semanas"}
          </span>
        )}
      </header>

      <section className="rounded-2xl bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <Link href={`/calendario?m=${shiftMonth(y, m, -1)}`} aria-label="Mes anterior" className="flex h-10 w-10 items-center justify-center text-xl">
            ‹
          </Link>
          <h2 className="font-display text-2xl font-bold">
            {MONTHS[m - 1]} {y}
          </h2>
          <Link href={`/calendario?m=${shiftMonth(y, m, 1)}`} aria-label="Mes siguiente" className="flex h-10 w-10 items-center justify-center text-xl">
            ›
          </Link>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center">
          {DAY_LETTERS.map((l, i) => (
            <span key={i} className="text-xs font-medium text-muted">
              {l}
            </span>
          ))}
          {cells.map((d, i) => {
            if (d === null) return <div key={i} className="h-12" />;
            const ymd = `${first.slice(0, 8)}${String(d).padStart(2, "0")}`;
            const ws = byDay.get(d);
            const isToday = ymd === today;
            const dayMin = ws ? mins(ws) : 0;
            const cls = `flex h-12 flex-col items-center justify-center rounded-xl font-display text-xl font-bold leading-none ${
              ws ? "bg-accent text-bg" : isToday ? "border-2 border-accent text-accent" : "text-muted"
            }`;
            return ws ? (
              <Link
                key={i}
                href={`/historial/${ws[0].id}`}
                className={cls}
                aria-label={`Día ${d}: ${ws[0].name}${dayMin ? `, ${dayMin} minutos` : ""}`}
              >
                {d}
                {dayMin > 0 && <span className="mt-0.5 font-sans text-[10px] font-semibold">{dayMin}′</span>}
              </Link>
            ) : (
              <div key={i} className={cls}>
                {d}
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="mes" className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
        <h2 id="mes" className="font-display text-2xl font-bold">
          Tu {MONTHS[m - 1].toLowerCase()}
        </h2>
        <dl className="grid grid-cols-2 gap-2">
          <StatTile
            label="Tiempo entrenado"
            value={formatMinutes(minutes)}
            delta={minutes - mins(inPrev)}
            deltaLabel={formatMinutes(Math.abs(minutes - mins(inPrev)))}
          />
          <StatTile label="Sesiones" value={String(inMonth.length)} delta={inMonth.length - inPrev.length} />
          <StatTile
            label="Promedio por sesión"
            value={finished ? formatMinutes(minutes / finished) : "—"}
            hint={`${n1.format(perWeek)} días por semana`}
          />
          <StatTile
            label={`Volumen (${unit})`}
            value={nf.format(toDisplay(volume, unit))}
            hint={`${workSets.length} series de trabajo`}
          />
        </dl>
        {muscles.length > 0 && (
          <div>
            <h3 className="mb-1.5 text-sm font-semibold">Series por músculo</h3>
            <RowBars data={muscles.map(([label, value]) => ({ label, value }))} />
          </div>
        )}
        {topRoutines.length > 0 && (
          <div>
            <h3 className="mb-1 text-sm font-semibold">Rutinas que más hiciste</h3>
            <p className="text-sm text-muted">
              {topRoutines.map(([name, n]) => `${name} (${n})`).join(" · ")}
            </p>
          </div>
        )}
        <p className="text-xs text-muted">Comparado contra {MONTHS[(m + 10) % 12].toLowerCase()}. El volumen no cuenta calentamientos.</p>
      </section>

      <section className="rounded-2xl bg-surface p-4">
        <h2 className="mb-1 font-display text-2xl font-bold">
          {inMonth.length} {inMonth.length === 1 ? "sesión" : "sesiones"} en {MONTHS[m - 1].toLowerCase()}
        </h2>
        {inMonth.length === 0 && <p className="text-sm text-muted">No hay sesiones este mes.</p>}
        {[...inMonth].reverse().map((w) => (
          <Link
            key={w.id}
            href={`/historial/${w.id}`}
            className="flex items-center justify-between border-t border-line py-2.5 first:border-t-0"
          >
            <span className="text-[15px]">
              <span className="text-muted">{formatDayMonth(new Date(w.started_at))} · </span>
              {w.name}
            </span>
            <span className="tabular text-sm text-muted">
              {w.ended_at ? `${minutesBetween(w.started_at, w.ended_at)} min` : "sin terminar"}
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
