/**
 * Timezone-correct date helpers built on Intl (no offset tables to maintain).
 *
 * Vocabulary:
 *  - "instant": a JS Date / ISO string in UTC
 *  - "local date": `YYYY-MM-DD` in a tenant's IANA timezone
 *  - "local time": `HH:mm` in a tenant's IANA timezone
 */

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    });
    formatterCache.set(timeZone, f);
  }
  return f;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sunday */
  weekday: number;
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const out: Record<string, string> = {};
  for (const p of partsFormatter(timeZone).formatToParts(date)) out[p.type] = p.value;
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour) % 24,
    minute: Number(out.minute),
    second: Number(out.second),
    weekday: WEEKDAYS.indexOf(out.weekday ?? "Sun"),
  };
}

/** Offset of `timeZone` from UTC at the given instant, in milliseconds (east is positive). */
export function tzOffsetMs(date: Date, timeZone: string): number {
  const p = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function parseLocalDate(dateStr: string): { y: number; m: number; d: number } {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { y: y!, m: m!, d: d! };
}

export function minutesOfDay(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h! * 60 + m!;
}

export function minutesToTime(total: number): string {
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/**
 * Convert a wall-clock time in `timeZone` to an instant.
 * Returns null when the wall-clock time does not exist (DST spring-forward gap).
 * For ambiguous times (fall-back overlap) the earlier instant wins.
 */
export function zonedTimeToUtc(dateStr: string, time: string, timeZone: string): Date | null {
  const { y, m, d } = parseLocalDate(dateStr);
  const mins = minutesOfDay(time);
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  const naive = Date.UTC(y, m - 1, d, hh, mm);

  const off1 = tzOffsetMs(new Date(naive), timeZone);
  let guess = naive - off1;
  const off2 = tzOffsetMs(new Date(guess), timeZone);
  if (off2 !== off1) guess = naive - off2;

  const p = getZonedParts(new Date(guess), timeZone);
  if (p.year !== y || p.month !== m || p.day !== d || p.hour !== hh || p.minute !== mm) {
    return null;
  }
  return new Date(guess);
}

/** Start of a local calendar day as an instant (handles zones whose DST gap swallows midnight). */
export function startOfLocalDay(dateStr: string, timeZone: string): Date {
  return (
    zonedTimeToUtc(dateStr, "00:00", timeZone) ??
    zonedTimeToUtc(dateStr, "01:00", timeZone) ??
    new Date(`${dateStr}T00:00:00Z`)
  );
}

export function localDateString(date: Date, timeZone: string): string {
  const p = getZonedParts(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function localTimeString(date: Date, timeZone: string): string {
  const p = getZonedParts(date, timeZone);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

export function localMinutes(date: Date, timeZone: string): number {
  const p = getZonedParts(date, timeZone);
  return p.hour * 60 + p.minute;
}

export function addDaysToLocalDate(dateStr: string, days: number): string {
  const { y, m, d } = parseLocalDate(dateStr);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function dayOfWeekOfLocalDate(dateStr: string): number {
  const { y, m, d } = parseLocalDate(dateStr);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Monday on or before the given local date. */
export function startOfLocalWeek(dateStr: string): string {
  const dow = dayOfWeekOfLocalDate(dateStr);
  const back = (dow + 6) % 7;
  return addDaysToLocalDate(dateStr, -back);
}

export function isValidLocalDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const { y, m, d } = parseLocalDate(value);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

export function startOfLocalMonth(date: Date, timeZone: string): Date {
  const p = getZonedParts(date, timeZone);
  return startOfLocalDay(`${p.year}-${pad(p.month)}-01`, timeZone);
}

export type FormatKind = "time" | "date" | "dayTime" | "weekday" | "full" | "monthDay";

export function formatInZone(date: Date, timeZone: string, kind: FormatKind = "dayTime"): string {
  const opts: Record<FormatKind, Intl.DateTimeFormatOptions> = {
    time: { hour: "numeric", minute: "2-digit" },
    date: { month: "short", day: "numeric", year: "numeric" },
    monthDay: { month: "short", day: "numeric" },
    weekday: { weekday: "long" },
    dayTime: { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
    full: {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    },
  };
  return new Intl.DateTimeFormat("en-US", { timeZone, ...opts[kind] }).format(date);
}

/** Format a `YYYY-MM-DD` string without any timezone drift. */
export function formatLocalDate(dateStr: string, opts: Intl.DateTimeFormatOptions): string {
  const { y, m, d } = parseLocalDate(dateStr);
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...opts }).format(
    new Date(Date.UTC(y, m - 1, d))
  );
}

export function format12h(time: string): string {
  const mins = minutesOfDay(time);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${suffix}`;
}

export function shortZoneName(date: Date, timeZone: string): string {
  const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? timeZone;
}
