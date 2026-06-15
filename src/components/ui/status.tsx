import type { AppointmentStatus } from "@/types";
import { Badge, type BadgeTone } from "@/components/ui/badge";

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

const TONE: Record<AppointmentStatus, BadgeTone> = {
  scheduled: "sand",
  confirmed: "teal",
  completed: "neutral",
  cancelled: "red",
  no_show: "amber",
};

/** Tailwind classes for calendar event blocks, keyed by status. */
export const EVENT_STYLE: Record<AppointmentStatus, string> = {
  scheduled: "bg-sand-200 text-ink-900 border-sand-400",
  confirmed: "bg-clinic-700 text-white border-clinic-900",
  completed: "bg-ink-100 text-ink-600 border-ink-300",
  cancelled: "bg-white text-ink-400 border-ink-200 line-through",
  no_show: "bg-amber-100 text-amber-900 border-amber-400",
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return <Badge tone={TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}
