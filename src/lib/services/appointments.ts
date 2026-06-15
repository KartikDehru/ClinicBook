import { AppointmentError } from "@/lib/errors";
import { authorize } from "@/lib/auth/rbac";
import { computeSlots, fitsWithinHours, type SlotOption } from "@/lib/availability";
import { fingerprintOf } from "@/lib/idempotency";
import { PLANS } from "@/lib/plans";
import {
  addDaysToLocalDate,
  isValidLocalDate,
  localDateString,
  startOfLocalDay,
  startOfLocalMonth,
} from "@/lib/time";
import { newId } from "@/lib/utils";
import type {
  Actor,
  Appointment,
  AppointmentStatus,
  Customer,
  Provider,
  Service,
  Tenant,
} from "@/types";
import type { AppointmentQuery } from "@/lib/repos/types";
import type { AuditService } from "@/lib/services/audit";
import type { Deps } from "@/lib/services/deps";
import type { Notifier } from "@/lib/services/notifier";
import type { WaitlistService } from "@/lib/services/waitlist";

export interface BookInput {
  tenantId: string;
  providerId: string;
  serviceId: string;
  /** Required for staff/owner. Clients always book for themselves. */
  customerId?: string;
  startsAt: string;
  notes?: string;
}

export type TransitionAction = "confirm" | "complete" | "no_show" | "cancel";

const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled: ["confirmed", "completed", "no_show", "cancelled"],
  confirmed: ["completed", "no_show", "cancelled"],
  completed: [],
  no_show: [],
  cancelled: [],
};

const ACTION_TO_STATUS: Record<TransitionAction, AppointmentStatus> = {
  confirm: "confirmed",
  complete: "completed",
  no_show: "no_show",
  cancel: "cancelled",
};

export interface BookResult {
  appointment: Appointment;
  replayed: boolean;
}

export class AppointmentService {
  constructor(
    private d: Deps,
    private audit: AuditService,
    private notifier: Notifier,
    private waitlist: WaitlistService
  ) {}

  // ---- reads ---------------------------------------------------------------------------------

  async list(
    actor: Actor | null,
    query: Omit<AppointmentQuery, "customerId"> & { customerId?: string }
  ): Promise<Appointment[]> {
    authorize(actor, "appointment:read", query.tenantId);
    if (actor!.role === "client") {
      const own = await this.d.repos.customers.getByEmail(query.tenantId, actor!.email);
      if (!own) return [];
      return this.d.repos.appointments.list({ ...query, customerId: own.id });
    }
    return this.d.repos.appointments.list(query);
  }

  async get(actor: Actor | null, id: string): Promise<Appointment> {
    const appt = await this.d.repos.appointments.get(id);
    if (!appt) throw new AppointmentError("NOT_FOUND", "Appointment not found.");
    authorize(actor, "appointment:read", appt.tenantId);
    await this.assertOwnerOrStaff(actor!, appt);
    return appt;
  }

  async slots(
    actor: Actor | null,
    input: { tenantId: string; providerId: string; serviceId: string; from?: string; days?: number }
  ): Promise<{ timezone: string; slots: SlotOption[] }> {
    authorize(actor, "appointment:read", input.tenantId);
    const { tenant, provider, service } = await this.loadBookingTargets(input);
    const now = this.d.now();
    const today = localDateString(now, tenant.timezone);
    const from = input.from && isValidLocalDate(input.from) && input.from >= today ? input.from : today;
    const days = Math.min(Math.max(input.days ?? 14, 1), 42);

    const busy = await this.d.repos.appointments.list({
      tenantId: tenant.id,
      providerId: provider.id,
      from: startOfLocalDay(addDaysToLocalDate(from, -1), tenant.timezone).toISOString(),
      to: startOfLocalDay(addDaysToLocalDate(from, days + 1), tenant.timezone).toISOString(),
    });
    return {
      timezone: tenant.timezone,
      slots: computeSlots({
        tenant,
        provider,
        durationMinutes: service.durationMinutes,
        busy,
        fromDate: from,
        days,
        now,
      }),
    };
  }

  // ---- writes --------------------------------------------------------------------------------

  /**
   * Books an appointment. When `idempotencyKey` is supplied the operation executes at most once per
   * (tenant, key); retries replay the original result.
   */
  async book(
    actor: Actor | null,
    input: BookInput,
    options: { idempotencyKey?: string } = {}
  ): Promise<BookResult> {
    authorize(actor, "appointment:create", input.tenantId);

    if (!options.idempotencyKey) {
      return { appointment: await this.bookOnce(actor!, input), replayed: false };
    }
    const fingerprint = fingerprintOf({ actor: actor!.userId, input });
    const result = await this.d.idempotency.run(
      input.tenantId,
      options.idempotencyKey,
      fingerprint,
      () => this.bookOnce(actor!, input)
    );
    return { appointment: result.value, replayed: result.replayed };
  }

  private async bookOnce(actor: Actor, input: BookInput): Promise<Appointment> {
    const { repos } = this.d;
    const { tenant, provider, service } = await this.loadBookingTargets(input);
    const customer = await this.resolveCustomer(actor, tenant, input.customerId);

    const starts = new Date(input.startsAt);
    if (Number.isNaN(starts.getTime())) {
      throw new AppointmentError("VALIDATION_FAILED", "startsAt must be an ISO-8601 datetime.");
    }
    const now = this.d.now();
    if (starts.getTime() < now.getTime()) {
      throw new AppointmentError("VALIDATION_FAILED", "Start time is in the past.");
    }
    const ends = new Date(starts.getTime() + service.durationMinutes * 60_000);

    if (!fitsWithinHours(tenant, provider, starts, ends)) {
      throw new AppointmentError(
        "OUTSIDE_HOURS",
        `${provider.name} is not available at that time (${tenant.timezone}).`,
        { timezone: tenant.timezone }
      );
    }

    await this.assertWithinPlanBookingCap(tenant, starts);

    const appointment: Appointment = {
      id: newId("apt"),
      tenantId: tenant.id,
      providerId: provider.id,
      customerId: customer.id,
      serviceId: service.id,
      serviceName: service.name,
      priceCents: service.priceCents,
      currency: service.currency,
      startsAt: starts.toISOString(),
      endsAt: ends.toISOString(),
      status: "scheduled",
      notes: input.notes,
      createdBy: actor.userId,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const inserted = await repos.appointments.insertIfSlotFree(appointment);
    if (!inserted) {
      throw new AppointmentError("SLOT_TAKEN", "That time was just booked. Choose another slot.", {
        providerId: provider.id,
        startsAt: appointment.startsAt,
        waitlistAvailable: PLANS[tenant.plan].limits.waitlist,
      });
    }

    await this.audit.record(actor, {
      tenantId: tenant.id,
      action: "appointment.created",
      entityType: "appointment",
      entityId: appointment.id,
      summary: `Booked ${service.name} for ${customer.name} with ${provider.name}`,
      after: { startsAt: appointment.startsAt, status: appointment.status },
    });
    await this.waitlist.markBooked(
      tenant.id,
      customer.id,
      provider.id,
      localDateString(starts, tenant.timezone)
    );
    void this.notifier.bookingConfirmed(appointment);
    return appointment;
  }

  async reschedule(actor: Actor | null, id: string, startsAt: string): Promise<Appointment> {
    const appt = await this.get(actor, id);
    const a = actor!;
    await this.assertCanMutate(a, appt, "reschedule");
    if (appt.status === "cancelled" || appt.status === "completed" || appt.status === "no_show") {
      throw new AppointmentError("INVALID_STATE", `A ${appt.status.replace("_", " ")} appointment cannot be rescheduled.`);
    }

    const [tenant, provider] = await Promise.all([
      this.d.repos.tenants.get(appt.tenantId),
      this.d.repos.providers.get(appt.providerId),
    ]);
    if (!tenant || !provider) throw new AppointmentError("NOT_FOUND", "Organization or provider not found.");

    const starts = new Date(startsAt);
    if (Number.isNaN(starts.getTime()) || starts.getTime() < this.d.now().getTime()) {
      throw new AppointmentError("VALIDATION_FAILED", "New start time must be in the future.");
    }
    const duration = Date.parse(appt.endsAt) - Date.parse(appt.startsAt);
    const ends = new Date(starts.getTime() + duration);
    if (!fitsWithinHours(tenant, provider, starts, ends)) {
      throw new AppointmentError("OUTSIDE_HOURS", `${provider.name} is not available at that time.`, {
        timezone: tenant.timezone,
      });
    }

    const previous = appt.startsAt;
    const moved = await this.d.repos.appointments.moveIfSlotFree(
      id,
      starts.toISOString(),
      ends.toISOString(),
      this.d.now().toISOString()
    );
    if (!moved) {
      throw new AppointmentError("SLOT_TAKEN", "That time is no longer available.", {
        providerId: provider.id,
      });
    }

    await this.audit.record(a, {
      tenantId: appt.tenantId,
      action: "appointment.rescheduled",
      entityType: "appointment",
      entityId: id,
      summary: `Rescheduled ${appt.serviceName}`,
      before: { startsAt: previous },
      after: { startsAt: moved.startsAt },
    });
    void this.notifier.rescheduled(moved, previous);
    await this.waitlist.offerFreedSlot(a, { ...appt, startsAt: previous });
    return moved;
  }

  async transition(
    actor: Actor | null,
    id: string,
    action: TransitionAction,
    opts: { reason?: string } = {}
  ): Promise<Appointment> {
    const appt = await this.get(actor, id);
    const a = actor!;
    const target = ACTION_TO_STATUS[action];
    await this.assertCanMutate(a, appt, action);

    if (!TRANSITIONS[appt.status].includes(target)) {
      throw new AppointmentError(
        "INVALID_STATE",
        `Cannot move an appointment from ${appt.status.replace("_", " ")} to ${target.replace("_", " ")}.`,
        { from: appt.status, to: target }
      );
    }

    const tenant = await this.d.repos.tenants.get(appt.tenantId);
    if (action === "cancel" && a.role === "client" && tenant && tenant.cancellationWindowHours > 0) {
      const hoursOut = (Date.parse(appt.startsAt) - this.d.now().getTime()) / 3_600_000;
      if (hoursOut < tenant.cancellationWindowHours) {
        throw new AppointmentError(
          "POLICY_VIOLATION",
          `Appointments can only be cancelled online up to ${tenant.cancellationWindowHours} hours before the start. Please call the clinic.`,
          { windowHours: tenant.cancellationWindowHours }
        );
      }
    }

    const updated = await this.d.repos.appointments.update(id, {
      status: target,
      updatedAt: this.d.now().toISOString(),
      ...(action === "cancel" && opts.reason ? { cancelReason: opts.reason.slice(0, 300) } : {}),
    });

    await this.audit.record(a, {
      tenantId: appt.tenantId,
      action: `appointment.${target}`,
      entityType: "appointment",
      entityId: id,
      summary: `${appt.serviceName} marked ${target.replace("_", " ")}`,
      before: { status: appt.status },
      after: { status: target, ...(opts.reason ? { reason: opts.reason } : {}) },
    });

    if (action === "cancel") {
      void this.notifier.cancelled(updated);
      await this.waitlist.offerFreedSlot(a, appt);
    }
    return updated;
  }

  // ---- helpers -------------------------------------------------------------------------------

  private async loadBookingTargets(input: {
    tenantId: string;
    providerId: string;
    serviceId: string;
  }): Promise<{ tenant: Tenant; provider: Provider; service: Service }> {
    const { repos } = this.d;
    const [tenant, provider, service] = await Promise.all([
      repos.tenants.get(input.tenantId),
      repos.providers.get(input.providerId),
      repos.services.get(input.serviceId),
    ]);
    if (!tenant) throw new AppointmentError("NOT_FOUND", "Organization not found.");
    if (!provider) throw new AppointmentError("NOT_FOUND", "Provider not found.");
    if (!service) throw new AppointmentError("NOT_FOUND", "Service not found.");
    if (provider.tenantId !== tenant.id || service.tenantId !== tenant.id) {
      throw new AppointmentError("TENANT_MISMATCH", "Provider or service belongs to another organization.");
    }
    if (!service.active) {
      throw new AppointmentError("VALIDATION_FAILED", "This service is not currently bookable.");
    }
    if (service.providerIds.length > 0 && !service.providerIds.includes(provider.id)) {
      throw new AppointmentError("VALIDATION_FAILED", `${provider.name} does not offer ${service.name}.`);
    }
    return { tenant, provider, service };
  }

  private async resolveCustomer(actor: Actor, tenant: Tenant, customerId?: string): Promise<Customer> {
    const { repos } = this.d;
    if (actor.role === "client") {
      const existing = await repos.customers.getByEmail(tenant.id, actor.email);
      if (existing) return existing;
      return repos.customers.insert({
        id: newId("cus"),
        tenantId: tenant.id,
        name: actor.name,
        email: actor.email,
        createdAt: this.d.now().toISOString(),
      });
    }
    if (!customerId) throw new AppointmentError("VALIDATION_FAILED", "customerId is required.");
    const customer = await repos.customers.get(customerId);
    if (!customer) throw new AppointmentError("NOT_FOUND", "Customer not found.");
    if (customer.tenantId !== tenant.id) {
      throw new AppointmentError("TENANT_MISMATCH", "Customer belongs to another organization.");
    }
    return customer;
  }

  private async assertWithinPlanBookingCap(tenant: Tenant, starts: Date): Promise<void> {
    const cap = PLANS[tenant.plan].limits.bookingsPerMonth;
    if (cap === null) return;
    const monthStart = startOfLocalMonth(starts, tenant.timezone);
    const y = Number(localDateString(starts, tenant.timezone).slice(0, 4));
    const m = Number(localDateString(starts, tenant.timezone).slice(5, 7));
    const nextMonthStr = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const monthEnd = startOfLocalDay(nextMonthStr, tenant.timezone);
    const existing = await this.d.repos.appointments.list({
      tenantId: tenant.id,
      from: monthStart.toISOString(),
      to: monthEnd.toISOString(),
    });
    const live = existing.filter((a) => a.status !== "cancelled").length;
    if (live >= cap) {
      throw new AppointmentError(
        "PLAN_LIMIT",
        `The ${PLANS[tenant.plan].name} plan includes ${cap} bookings per month. Upgrade to keep booking.`,
        { feature: "bookingsPerMonth", limit: cap, plan: tenant.plan }
      );
    }
  }

  /** Clients may only see their own appointments; staff and owners see all in-tenant. */
  private async assertOwnerOrStaff(actor: Actor, appt: Appointment): Promise<void> {
    if (actor.role !== "client") return;
    const customer = await this.d.repos.customers.get(appt.customerId);
    if (!customer || customer.email.toLowerCase() !== actor.email.toLowerCase()) {
      throw new AppointmentError("FORBIDDEN", "You can only access your own appointments.");
    }
  }

  private async assertCanMutate(actor: Actor, appt: Appointment, action: string): Promise<void> {
    if (actor.role === "client") {
      authorize(actor, "appointment:cancel_own", appt.tenantId);
      if (action !== "cancel" && action !== "reschedule") {
        throw new AppointmentError("FORBIDDEN", "Clients can only cancel or reschedule.");
      }
      await this.assertOwnerOrStaff(actor, appt);
    } else {
      authorize(actor, "appointment:manage", appt.tenantId);
    }
  }
}
