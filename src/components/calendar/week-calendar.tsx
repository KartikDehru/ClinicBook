import Link from "next/link";
import { layoutDayEvents } from "@/lib/calendar-layout";
import {
  addDaysToLocalDate,
  dayOfWeekOfLocalDate,
  formatInZone,
  formatLocalDate,
  localDateString,
  localMinutes,
  minutesOfDay,
} from "@/lib/time";
import { cn } from "@/lib/utils";
import { EVENT_STYLE } from "@/components/ui/status";
import type { Appointment, Tenant } from "@/types";

const PX_PER_MIN = 1;

export interface CalendarEvent extends Appointment {
  customerName: string;
  providerName: string;
}

interface Props {
  tenant: Tenant;
  weekStart: string;
  events: CalendarEvent[];
  now: Date;
  selectedId?: string;
  eventHref: (id: string) => string;
}

export function WeekCalendar({ tenant, weekStart, events, now, selectedId, eventHref }: Props) {
  const tz = tenant.timezone;
  const days = Array.from({ length: 7 }, (_, i) => addDaysToLocalDate(weekStart, i));
  const today = localDateString(now, tz);

  // Visible hour range: business hours, widened to include any appointment outside them.
  const opens = tenant.businessHours.filter((h) => h.open).map((h) => minutesOfDay(h.open!));
  const closes = tenant.businessHours.filter((h) => h.close).map((h) => minutesOfDay(h.close!));
  let startMin = Math.min(...(opens.length ? opens : [8 * 60]));
  let endMin = Math.max(...(closes.length ? closes : [18 * 60]));
  const placed = events.map((e) => ({
    ...e,
    date: localDateString(new Date(e.startsAt), tz),
    s: localMinutes(new Date(e.startsAt), tz),
    e: localMinutes(new Date(e.startsAt), tz) + (Date.parse(e.endsAt) - Date.parse(e.startsAt)) / 60_000,
  }));
  for (const p of placed) {
    startMin = Math.min(startMin, p.s);
    endMin = Math.max(endMin, p.e);
  }
  startMin = Math.floor(startMin / 60) * 60;
  endMin = Math.min(24 * 60, Math.ceil(endMin / 60) * 60);
  const height = (endMin - startMin) * PX_PER_MIN;
  const hourMarks = Array.from({ length: (endMin - startMin) / 60 }, (_, i) => startMin + i * 60);

  const nowMin = localMinutes(now, tz);

  return (
    <div className="overflow-x-auto rounded-lg border border-ink-100 bg-white shadow-panel scroll-thin">
      <div className="min-w-[900px]">
        <div className="sticky top-0 z-10 grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-ink-100 bg-white">
          <div />
          {days.map((d) => {
            const isToday = d === today;
            const count = placed.filter((p) => p.date === d && p.status !== "cancelled").length;
            return (
              <div key={d} className="border-l border-ink-100 px-3 py-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">
                  {formatLocalDate(d, { weekday: "short" })}
                </p>
                <p className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "font-display text-xl font-semibold tabular-nums",
                      isToday ? "rounded bg-clinic-700 px-1.5 text-white" : "text-ink-900"
                    )}
                  >
                    {formatLocalDate(d, { day: "numeric" })}
                  </span>
                  <span className="text-xs text-ink-400">{count > 0 ? `${count} booked` : ""}</span>
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))]" style={{ height }}>
          <div className="relative">
            {hourMarks.map((m) => (
              <span
                key={m}
                className="absolute right-2 -translate-y-1/2 text-[11px] font-semibold tabular-nums text-ink-400"
                style={{ top: (m - startMin) * PX_PER_MIN }}
              >
                {m === startMin ? "" : formatHour(m)}
              </span>
            ))}
          </div>

          {days.map((d) => {
            const hours = tenant.businessHours.find((h) => h.day === dayOfWeekOfLocalDate(d));
            const open = hours?.open ? minutesOfDay(hours.open) : null;
            const close = hours?.close ? minutesOfDay(hours.close) : null;
            const dayEvents = layoutDayEvents(
              placed
                .filter((p) => p.date === d)
                // Short appointments render at a 22px minimum, so reserve that much room when stacking.
                .map((p) => ({ id: p.id, startMin: p.s, endMin: Math.max(p.e, p.s + 22 / PX_PER_MIN), ref: p }))
            );
            return (
              <div key={d} className="relative border-l border-ink-100" data-date={d}>
                {hourMarks.map((m) => (
                  <div
                    key={m}
                    className="absolute inset-x-0 border-t border-ink-100"
                    style={{ top: (m - startMin) * PX_PER_MIN }}
                  />
                ))}
                {open === null || close === null ? (
                  <div className="bg-closed absolute inset-0" />
                ) : (
                  <>
                    <div className="bg-closed absolute inset-x-0 top-0" style={{ height: Math.max(0, (open - startMin) * PX_PER_MIN) }} />
                    <div
                      className="bg-closed absolute inset-x-0 bottom-0"
                      style={{ height: Math.max(0, (endMin - close) * PX_PER_MIN) }}
                    />
                  </>
                )}

                {d === today && nowMin >= startMin && nowMin <= endMin && (
                  <div className="absolute inset-x-0 z-[5] border-t-2 border-signal-red" style={{ top: (nowMin - startMin) * PX_PER_MIN }}>
                    <span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-signal-red" />
                  </div>
                )}

                {dayEvents.map(({ event, column, columns }) => {
                  const a = event.ref;
                  const h = Math.max(22, (a.e - a.s) * PX_PER_MIN - 2);
                  const selected = a.id === selectedId;
                  return (
                    <Link
                      key={a.id}
                      href={eventHref(a.id)}
                      title={`${a.customerName} · ${a.serviceName} · ${a.providerName}`}
                      className={cn(
                        "absolute z-[4] overflow-hidden rounded border-l-4 px-1.5 py-0.5 text-[11px] leading-tight transition-shadow hover:shadow-md",
                        EVENT_STYLE[a.status],
                        selected && "ring-2 ring-ink-900 ring-offset-1"
                      )}
                      style={{
                        top: (a.s - startMin) * PX_PER_MIN + 1,
                        height: h,
                        left: `calc(${(column / columns) * 100}% + 2px)`,
                        width: `calc(${100 / columns}% - 4px)`,
                      }}
                    >
                      <span className="block truncate font-bold">{a.customerName}</span>
                      {h >= 38 && (
                        <span className="block truncate opacity-80">
                          {formatInZone(new Date(a.startsAt), tz, "time")} · {a.serviceName}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatHour(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 === 0 ? 12 : h % 12} ${suffix}`;
}
