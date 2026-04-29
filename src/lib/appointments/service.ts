import { addMinutes, parseISO, setHours, setMinutes } from "date-fns";
import { store } from "@/lib/store";
import type { Appointment, AppointmentStatus } from "@/types";
import { sendAppointmentEmail } from "@/lib/email/notifications";

export interface BookAppointmentInput {
  tenantId: string;
  providerId: string;
  customerId: string;
  startsAt: string;
  durationMinutes?: number;
  serviceName: string;
  notes?: string;
}

export function getAppointmentsForTenant(tenantId: string): Appointment[] {
  return store.appointments.filter((a) => a.tenantId === tenantId);
}

export function getAppointmentById(id: string): Appointment | undefined {
  return store.appointments.find((a) => a.id === id);
}

export function bookAppointment(input: BookAppointmentInput): Appointment {
  const starts = parseISO(input.startsAt);
  const ends = addMinutes(starts, input.durationMinutes ?? 30);
  const customer = store.customers.find((c) => c.id === input.customerId);

  const appointment: Appointment = {
    id: store.generateId("apt"),
    tenantId: input.tenantId,
    providerId: input.providerId,
    customerId: input.customerId,
    startsAt: starts.toISOString(),
    endsAt: ends.toISOString(),
    status: "scheduled",
    serviceName: input.serviceName,
    notes: input.notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const conflict = store.appointments.some(
    (a) =>
      a.providerId === input.providerId &&
      a.status !== "cancelled" &&
      parseISO(a.startsAt) < ends &&
      parseISO(a.endsAt) > starts
  );

  if (conflict) {
    throw new Error("Time slot is no longer available");
  }

  store.appointments.push(appointment);

  if (customer) {
    void sendAppointmentEmail({
      type: "booked",
      customerEmail: customer.email,
      customerName: customer.name,
      serviceName: input.serviceName,
      startsAt: appointment.startsAt,
    });
  }

  return appointment;
}

export function rescheduleAppointment(
  appointmentId: string,
  newStartsAt: string,
  durationMinutes = 30
): Appointment {
  const apt = getAppointmentById(appointmentId);
  if (!apt) throw new Error("Appointment not found");
  if (apt.status === "cancelled") throw new Error("Cannot reschedule cancelled appointment");

  const starts = parseISO(newStartsAt);
  const ends = addMinutes(starts, durationMinutes);
  apt.startsAt = starts.toISOString();
  apt.endsAt = ends.toISOString();
  apt.status = "confirmed";
  apt.updatedAt = new Date().toISOString();

  const customer = store.customers.find((c) => c.id === apt.customerId);
  if (customer) {
    void sendAppointmentEmail({
      type: "rescheduled",
      customerEmail: customer.email,
      customerName: customer.name,
      serviceName: apt.serviceName,
      startsAt: apt.startsAt,
    });
  }

  return apt;
}

export function cancelAppointment(appointmentId: string, reason?: string): Appointment {
  const apt = getAppointmentById(appointmentId);
  if (!apt) throw new Error("Appointment not found");

  apt.status = "cancelled";
  apt.notes = [apt.notes, reason].filter(Boolean).join(" | ");
  apt.updatedAt = new Date().toISOString();

  const customer = store.customers.find((c) => c.id === apt.customerId);
  if (customer) {
    void sendAppointmentEmail({
      type: "cancelled",
      customerEmail: customer.email,
      customerName: customer.name,
      serviceName: apt.serviceName,
      startsAt: apt.startsAt,
    });
  }

  return apt;
}

export function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus
): Appointment {
  const apt = getAppointmentById(appointmentId);
  if (!apt) throw new Error("Appointment not found");
  apt.status = status;
  apt.updatedAt = new Date().toISOString();
  return apt;
}

export function buildSlotDate(baseDate: Date, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  return setMinutes(setHours(baseDate, h), m);
}