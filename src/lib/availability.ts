import type { Appointment, Provider, Tenant } from "@/types";
import {
  addDaysToLocalDate,
  dayOfWeekOfLocalDate,
  formatInZone,
  localDateString,
  localTimeString,
  minutesOfDay,
  minutesToTime,
  zonedTimeToUtc,
} from "@/lib/time";

export interface SlotOption {
  startsAt: string;
  endsAt: string;
  /** Local date in the tenant timezone */
  localDate: string;
  /** Local time in the tenant timezone (`HH:mm`) */
  localTime: string;
  label: string;
}

export interface TimeWindow {
  start: string;
  end: string;
}

/** Opening windows for one local calendar day: tenant hours ∩ provider availability. */
export function windowsForDay(tenant: Tenant, provider: Provider, localDate: string): TimeWindow[] {
  const dow = dayOfWeekOfLocalDate(localDate);
  const hours = tenant.businessHours.find((h) => h.day === dow);
  if (!hours?.open || !hours.close) return [];
  const tenantStart = minutesOfDay(hours.open);
  const tenantEnd = minutesOfDay(hours.close);

  // A provider with no configured availability follows tenant hours.
  if (provider.availability.length === 0) {
    return [{ start: hours.open, end: hours.close }];
  }

  const out: TimeWindow[] = [];
  for (const w of provider.availability.filter((a) => a.dayOfWeek === dow)) {
    const start = Math.max(tenantStart, minutesOfDay(w.start));
    const end = Math.min(tenantEnd, minutesOfDay(w.end));
    if (start < end) out.push({ start: minutesToTime(start), end: minutesToTime(end) });
  }
  return out;
}

/** True when [startsAt, endsAt) sits fully inside one opening window on a single local day. */
export function fitsWithinHours(
  tenant: Tenant,
  provider: Provider,
  startsAt: Date,
  endsAt: Date
): boolean {
  const tz = tenant.timezone;
  const date = localDateString(startsAt, tz);
  if (localDateString(new Date(endsAt.getTime() - 1), tz) !== date) return false;

  return windowsForDay(tenant, provider, date).some((w) => {
    const ws = zonedTimeToUtc(date, w.start, tz);
    const we = zonedTimeToUtc(date, w.end, tz);
    return !!ws && !!we && ws <= startsAt && endsAt <= we;
  });
}

export function slotStepFor(durationMinutes: number): number {
  return durationMinutes % 30 === 0 ? 30 : 15;
}

export interface ComputeSlotsInput {
  tenant: Tenant;
  provider: Provider;
  durationMinutes: number;
  /** Non-cancelled appointments for this provider (any range). */
  busy: Pick<Appointment, "startsAt" | "endsAt" | "status">[];
  /** Local date (tenant tz) of the first day to generate. */
  fromDate: string;
  days: number;
  now: Date;
  minNoticeMinutes?: number;
}

/** Pure, timezone-aware slot generation. Every wall-clock time is resolved through the tenant timezone. */
export function computeSlots(input: ComputeSlotsInput): SlotOption[] {
  const { tenant, provider, durationMinutes, busy, fromDate, days, now } = input;
  const tz = tenant.timezone;
  const earliest = new Date(now.getTime() + (input.minNoticeMinutes ?? 60) * 60_000);
  const step = slotStepFor(durationMinutes);
  const live = busy
    .filter((b) => b.status !== "cancelled")
    .map((b) => ({ s: new Date(b.startsAt).getTime(), e: new Date(b.endsAt).getTime() }));

  const slots: SlotOption[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDaysToLocalDate(fromDate, i);
    for (const w of windowsForDay(tenant, provider, date)) {
      const winStart = minutesOfDay(w.start);
      const winEnd = minutesOfDay(w.end);
      for (let m = winStart; m + durationMinutes <= winEnd; m += step) {
        const start = zonedTimeToUtc(date, minutesToTime(m), tz);
        if (!start || start < earliest) continue;
        const end = new Date(start.getTime() + durationMinutes * 60_000);
        const s = start.getTime();
        const e = end.getTime();
        if (live.some((b) => b.s < e && b.e > s)) continue;
        slots.push({
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          localDate: date,
          localTime: localTimeString(start, tz),
          label: formatInZone(start, tz, "dayTime"),
        });
      }
    }
  }
  return slots;
}
