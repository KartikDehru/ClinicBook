"use client";

import type { TimeSlotOption } from "@/lib/availability/slots";
import { cn } from "@/lib/utils";

interface SlotPickerProps {
  slots: TimeSlotOption[];
  value?: string;
  onChange: (startsAt: string) => void;
}

export function SlotPicker({ slots, value, onChange }: SlotPickerProps) {
  if (!slots.length) {
    return <p className="text-sm text-slate-500">No open slots in the next week.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {slots.map((slot) => (
        <button
          key={slot.startsAt}
          type="button"
          onClick={() => onChange(slot.startsAt)}
          className={cn(
            "rounded-lg border px-3 py-2 text-left text-sm transition",
            value === slot.startsAt
              ? "border-brand-500 bg-brand-50 text-brand-900"
              : "border-slate-200 hover:border-brand-300"
          )}
        >
          {slot.label}
        </button>
      ))}
    </div>
  );
}