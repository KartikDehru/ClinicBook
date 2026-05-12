import { z } from "zod";

export const bookAppointmentSchema = z.object({
  tenantId: z.string().min(1),
  providerId: z.string().min(1),
  customerId: z.string().min(1),
  startsAt: z.string().datetime(),
  serviceName: z.string().min(2).max(120),
  notes: z.string().max(500).optional(),
  durationMinutes: z.number().int().min(15).max(240).optional(),
});

export const rescheduleSchema = z.object({
  appointmentId: z.string().min(1),
  startsAt: z.string().datetime(),
});

export const cancelSchema = z.object({
  appointmentId: z.string().min(1),
  reason: z.string().max(300).optional(),
});

export const createCustomerSchema = z.object({
  tenantId: z.string().min(1),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const checkoutSchema = z.object({
  tenantId: z.string().min(1),
  plan: z.enum(["pro", "enterprise"]),
});