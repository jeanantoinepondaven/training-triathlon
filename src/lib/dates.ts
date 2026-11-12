// Dates are handled as "YYYY-MM-DD" strings in local calendar terms (no time zones).

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

function toUTC(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}
function fromUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isISODate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(toUTC(s).getTime());
}

export function addDays(d: string, n: number): string {
  const x = toUTC(d);
  x.setUTCDate(x.getUTCDate() + n);
  return fromUTC(x);
}

/** 0 = Monday … 6 = Sunday */
export function weekdayIndex(d: string): number {
  return (toUTC(d).getUTCDay() + 6) % 7;
}

export function mondayOf(d: string): string {
  return addDays(d, -weekdayIndex(d));
}

export function weekDates(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function diffDays(a: string, b: string): number {
  return Math.round((toUTC(a).getTime() - toUTC(b).getTime()) / 86400000);
}

/** Today's date in the app's time zone (defaults to Europe/Paris, override with APP_TIMEZONE). */
export function today(): string {
  const tz = process.env.APP_TIMEZONE ?? process.env.NEXT_PUBLIC_APP_TIMEZONE ?? "Europe/Paris";
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
}

export function formatDay(d: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }): string {
  return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" }).format(toUTC(d));
}

/** ISO-8601 week number (Monday-based), e.g. 46 for 9–15 Nov 2026. */
export function isoWeek(d: string): number {
  const [y, m, day] = d.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, day));
  const dow = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dow + 3);
  const firstThu = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((date.getTime() - firstThu.getTime()) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
}

export function weekRange(monday: string): string {
  const sun = addDays(monday, 6);
  const m1 = formatDay(monday, { month: "short" });
  const m2 = formatDay(sun, { month: "short" });
  return m1 === m2 ? `${Number(monday.slice(8))}–${Number(sun.slice(8))} ${m2}` : `${formatDay(monday, { day: "numeric", month: "short" })} – ${formatDay(sun, { day: "numeric", month: "short" })}`;
}
