// Todas las fechas se interpretan en la zona horaria del usuario.
export const TZ = "America/Mexico_City";

export function localYmd(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** 1 = lunes ... 7 = domingo */
export function isoWeekday(d: Date): number {
  const w = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(d);
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(w) + 1;
}

export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Lunes de la semana de `d`, como YYYY-MM-DD */
export function weekStart(d: Date): string {
  return addDays(localYmd(d), -(isoWeekday(d) - 1));
}

export function formatLong(d: Date): string {
  const s = new Intl.DateTimeFormat("es-MX", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatShort(d: Date): string {
  const s = new Intl.DateTimeFormat("es-MX", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
  }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Semanas consecutivas con al menos una sesión (cuenta desde esta semana o la anterior). */
export function streakWeeks(workoutDates: Date[], now = new Date()): number {
  const weeks = new Set(workoutDates.map((d) => weekStart(d)));
  let cursor = weekStart(now);
  if (!weeks.has(cursor)) cursor = addDays(cursor, -7);
  let streak = 0;
  while (weeks.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -7);
  }
  return streak;
}

export function minutesBetween(a: string, b: string): number {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000));
}
