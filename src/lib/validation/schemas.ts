import { z } from "zod";

const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:mm");

export const bookAppointmentSchema = z.object({
  tenantId: z.string().min(1),
  providerId: z.string().min(1),
  serviceId: z.string().min(1),
  customerId: z.string().min(1).optional(),
  startsAt: z.string().datetime({ offset: true }),
  notes: z.string().max(500).optional(),
});

export const appointmentActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm") }),
  z.object({ action: z.literal("complete") }),
  z.object({ action: z.literal("no_show") }),
  z.object({ action: z.literal("cancel"), reason: z.string().max(300).optional() }),
  z.object({ action: z.literal("reschedule"), startsAt: z.string().datetime({ offset: true }) }),
]);

export const slotsQuerySchema = z.object({
  tenantId: z.string().min(1),
  providerId: z.string().min(1),
  serviceId: z.string().min(1),
  from: localDate.optional(),
  days: z.coerce.number().int().min(1).max(42).optional(),
});

export const appointmentsQuerySchema = z.object({
  tenantId: z.string().min(1),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  providerId: z.string().optional(),
  status: z.enum(["scheduled", "confirmed", "completed", "cancelled", "no_show"]).optional(),
});

export const createCustomerSchema = z.object({
  tenantId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  phone: z.string().max(40).optional(),
  notes: z.string().max(500).optional(),
});

export const joinWaitlistSchema = z.object({
  tenantId: z.string().min(1),
  providerId: z.string().min(1),
  serviceId: z.string().min(1),
  customerId: z.string().min(1).optional(),
  desiredDate: localDate,
  note: z.string().max(300).optional(),
});

export const checkoutSchema = z.object({
  tenantId: z.string().min(1),
  plan: z.enum(["pro", "enterprise"]),
});

export const settingsSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  timezone: z.string().min(3).max(64).optional(),
  businessHours: z
    .array(
      z.object({
        day: z.number().int().min(0).max(6),
        open: hhmm.nullable(),
        close: hhmm.nullable(),
      })
    )
    .length(7)
    .optional(),
  cancellationPolicy: z.string().max(600).optional(),
  cancellationWindowHours: z.number().int().min(0).max(168).optional(),
});

export const createServiceSchema = z.object({
  tenantId: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  description: z.string().max(240).optional(),
  durationMinutes: z.number().int().min(15).max(240),
  priceCents: z.number().int().min(0).max(1_000_000),
  currency: z.string().length(3).optional(),
  providerIds: z.array(z.string()).optional(),
});

export const serviceActiveSchema = z.object({ active: z.boolean() });

export const inviteStaffSchema = z.object({
  tenantId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
});

export const demoLoginSchema = z.object({ userId: z.string().min(1) });
