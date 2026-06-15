"use client";

import { useEffect, useMemo, useState } from "react";
import type { SlotOption } from "@/lib/availability";
import { formatLocalDate, format12h } from "@/lib/time";
import { cn } from "@/lib/utils";

interface Props {
  slots: SlotOption[];
  value: string;
  onChange: (startsAt: string) => void;
  timezoneLabel: string;
  /** Rendered when a chosen day has nothing left. */
  emptyHint?: React.ReactNode;
  onDateChange?: (date: string | null) => void;
}

export function SlotPicker({ slots, value, onChange, timezoneLabel, emptyHint, onDateChange }: Props) {
  const byDate = useMemo(() => {
    const map = new Map<string, SlotOption[]>();
    for (const s of slots) map.set(s.localDate, [...(map.get(s.localDate) ?? []), s]);
    return map;
  }, [slots]);
  const dates = useMemo(() => [...byDate.keys()], [byDate]);

  const [date, setDate] = useState<string | null>(null);
  const selectedDate = value ? slots.find((s) => s.startsAt === value)?.localDate ?? null : null;
  const active = date && byDate.has(date) ? date : selectedDate ?? dates[0] ?? null;

  useEffect(() => {
    onDateChange?.(active);
  }, [active, onDateChange]);

  if (dates.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-ink-200 bg-white p-5 text-sm text-ink-600">
        {emptyHint ?? "No openings in the next few weeks."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Choose a day" className="flex gap-2 overflow-x-auto pb-1 scroll-thin">
        {dates.map((d) => {
          const isActive = d === active;
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setDate(d)}
              className={cn(
                "flex w-16 shrink-0 flex-col items-center rounded-md border px-2 py-2 text-center transition-colors",
                isActive ? "border-clinic-700 bg-clinic-700 text-white" : "border-ink-200 bg-white text-ink-800 hover:border-clinic-500"
              )}
            >
              <span className="text-[11px] font-bold uppercase tracking-wide opacity-80">
                {formatLocalDate(d, { weekday: "short" })}
              </span>
              <span className="font-display text-xl font-semibold leading-tight">
                {formatLocalDate(d, { day: "numeric" })}
              </span>
              <span className="text-[11px] opacity-80">{formatLocalDate(d, { month: "short" })}</span>
            </button>
          );
        })}
      </div>

      {active && (
        <div>
          <p className="mb-2 text-sm font-semibold text-ink-700">
            {formatLocalDate(active, { weekday: "long", month: "long", day: "numeric" })}
            <span className="ml-2 font-normal text-ink-400">Times in {timezoneLabel}</span>
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {(byDate.get(active) ?? []).map((s) => (
              <button
                key={s.startsAt}
                type="button"
                aria-pressed={value === s.startsAt}
                onClick={() => onChange(s.startsAt)}
                className={cn(
                  "rounded-md border px-2 py-2 text-sm font-semibold tabular-nums transition-colors",
                  value === s.startsAt
                    ? "border-clinic-700 bg-clinic-700 text-white"
                    : "border-ink-200 bg-white text-ink-800 hover:border-clinic-500"
                )}
              >
                {format12h(s.localTime)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
