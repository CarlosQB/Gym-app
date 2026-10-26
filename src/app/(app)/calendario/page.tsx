import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { addDays, formatDayMonth, localYmd, minutesBetween, streakWeeks } from "@/lib/dates";

const DAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];
const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

type W = { id: string; name: string; started_at: string; ended_at: string | null };

function shiftMonth(y: number, m: number, d: number) {
  const t = new Date(Date.UTC(y, m - 1 + d, 1));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`;
}

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
  const from = new Date(`${addDays(first, -1)}T00:00:00Z`).toISOString();
  const to = new Date(`${addDays(first, daysInMonth + 1)}T00:00:00Z`).toISOString();
  const since = new Date(`${addDays(today, -400)}T00:00:00Z`).toISOString();

  const [monthRes, allRes] = await Promise.all([
    supabase.from("workouts").select("id, name, started_at, ended_at").gte("started_at", from).lt("started_at", to).order("started_at"),
    supabase.from("workouts").select("started_at").not("ended_at", "is", null).gte("started_at", since),
  ]);

  const inMonth = ((monthRes.data ?? []) as W[]).filter((w) => localYmd(new Date(w.started_at)).startsWith(first.slice(0, 7)));
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
            if (d === null) return <div key={i} className="h-11" />;
            const ymd = `${first.slice(0, 8)}${String(d).padStart(2, "0")}`;
            const ws = byDay.get(d);
            const isToday = ymd === today;
            const cls = `flex h-11 items-center justify-center rounded-xl font-display text-xl font-bold ${
              ws ? "bg-accent text-bg" : isToday ? "border-2 border-accent text-accent" : "text-muted"
            }`;
            return ws ? (
              <Link key={i} href={`/historial/${ws[0].id}`} className={cls} aria-label={`Sesión del día ${d}`}>
                {d}
              </Link>
            ) : (
              <div key={i} className={cls}>
                {d}
              </div>
            );
          })}
        </div>
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
