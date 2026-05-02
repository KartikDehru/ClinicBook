import { addDays, addMinutes, format, getDay, isBefore, setHours, setMinutes, startOfDay } from "date-fns";
import { store } from "@/lib/store";
import { buildSlotDate } from "@/lib/appointments/service";

export interface TimeSlotOption {
  startsAt: string;
  endsAt: string;
  label: string;
}

export function getAvailabilityForProvider(providerId: string) {
  return store.availability.filter((a) => a.providerId === providerId);
}

export function generateOpenSlots(
  providerId: string,
  fromDate: Date,
  days = 7,
  slotMinutes = 30
): TimeSlotOption[] {
  const windows = getAvailabilityForProvider(providerId);
  const slots: TimeSlotOption[] = [];
  const now = new Date();

  for (let d = 0; d < days; d++) {
    const day = addDays(startOfDay(fromDate), d);
    const dow = getDay(day);
    const dayWindows = windows.filter((w) => w.dayOfWeek === dow);

    for (const window of dayWindows) {
      let cursor = buildSlotDate(day, window.startTime);
      const windowEnd = buildSlotDate(day, window.endTime);

      while (isBefore(addMinutes(cursor, slotMinutes), windowEnd) || +cursor === +windowEnd) {
        const end = addMinutes(cursor, slotMinutes);
        if (isBefore(end, windowEnd) || +end === +windowEnd) {
          const conflict = store.appointments.some(
            (a) =>
              a.providerId === providerId &&
              a.status !== "cancelled" &&
              new Date(a.startsAt) < end &&
              new Date(a.endsAt) > cursor
          );

          if (!conflict && !isBefore(cursor, now)) {
            slots.push({
              startsAt: cursor.toISOString(),
              endsAt: end.toISOString(),
              label: format(cursor, "EEE, MMM d · h:mm a"),
            });
          }
        }
        cursor = addMinutes(cursor, slotMinutes);
      }
    }
  }

  return slots;
}

export function formatWeeklyHours(providerId: string): string[] {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days.map((label, index) => {
    const blocks = store.availability.filter(
      (a) => a.providerId === providerId && a.dayOfWeek === index
    );
    if (!blocks.length) return `${label}: —`;
    return `${label}: ${blocks.map((b) => `${b.startTime}–${b.endTime}`).join(", ")}`;
  });
}

export function setMinutesOnDate(date: Date, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  return setMinutes(setHours(date, h), m);
}