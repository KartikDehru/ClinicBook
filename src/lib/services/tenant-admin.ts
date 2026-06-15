import { AppointmentError } from "@/lib/errors";
import { authorize } from "@/lib/auth/rbac";
import { PLANS } from "@/lib/plans";
import { isValidTimeZone, minutesOfDay } from "@/lib/time";
import { newId } from "@/lib/utils";
import type { Actor, DayHours, Service, Tenant, User } from "@/types";
import type { AuditService } from "@/lib/services/audit";
import type { Deps } from "@/lib/services/deps";
import type { Notifier } from "@/lib/services/notifier";

export interface UpdateSettingsInput {
  name?: string;
  timezone?: string;
  businessHours?: DayHours[];
  cancellationPolicy?: string;
  cancellationWindowHours?: number;
}

export interface CreateServiceInput {
  tenantId: string;
  name: string;
  description?: string;
  durationMinutes: number;
  priceCents: number;
  currency?: string;
  providerIds?: string[];
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateBusinessHours(hours: DayHours[]): void {
  if (hours.length !== 7) {
    throw new AppointmentError("VALIDATION_FAILED", "Business hours must define all 7 days.");
  }
  const seen = new Set<number>();
  for (const h of hours) {
    if (!Number.isInteger(h.day) || h.day < 0 || h.day > 6 || seen.has(h.day)) {
      throw new AppointmentError("VALIDATION_FAILED", "Business hours contain an invalid or duplicate day.");
    }
    seen.add(h.day);
    if ((h.open === null) !== (h.close === null)) {
      throw new AppointmentError("VALIDATION_FAILED", "Each open day needs both an opening and closing time.");
    }
    if (h.open !== null && h.close !== null) {
      if (!TIME.test(h.open) || !TIME.test(h.close)) {
        throw new AppointmentError("VALIDATION_FAILED", "Times must be HH:mm.");
      }
      if (minutesOfDay(h.open) >= minutesOfDay(h.close)) {
        throw new AppointmentError("VALIDATION_FAILED", "Closing time must be after opening time.");
      }
    }
  }
}

export class TenantAdminService {
  constructor(
    private d: Deps,
    private audit: AuditService,
    private notifier: Notifier
  ) {}

  // ---- settings ------------------------------------------------------------------------------

  async updateSettings(actor: Actor | null, tenantId: string, input: UpdateSettingsInput): Promise<Tenant> {
    authorize(actor, "settings:write", tenantId);
    const tenant = await this.d.repos.tenants.get(tenantId);
    if (!tenant) throw new AppointmentError("NOT_FOUND", "Organization not found.");

    if (input.timezone !== undefined && !isValidTimeZone(input.timezone)) {
      throw new AppointmentError("VALIDATION_FAILED", `"${input.timezone}" is not a valid IANA timezone.`);
    }
    if (input.businessHours) validateBusinessHours(input.businessHours);

    const patch: Partial<Tenant> = {};
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.timezone !== undefined) patch.timezone = input.timezone;
    if (input.businessHours) patch.businessHours = [...input.businessHours].sort((a, b) => a.day - b.day);
    if (input.cancellationPolicy !== undefined) patch.cancellationPolicy = input.cancellationPolicy.trim();
    if (input.cancellationWindowHours !== undefined) {
      patch.cancellationWindowHours = input.cancellationWindowHours;
    }

    const updated = await this.d.repos.tenants.update(tenantId, patch);
    await this.audit.record(actor!, {
      tenantId,
      action: "tenant.settings_updated",
      entityType: "tenant",
      entityId: tenantId,
      summary: `Updated ${Object.keys(patch).join(", ")}`,
      before: { timezone: tenant.timezone, cancellationWindowHours: tenant.cancellationWindowHours },
      after: { timezone: updated.timezone, cancellationWindowHours: updated.cancellationWindowHours },
    });
    return updated;
  }

  // ---- service catalog -----------------------------------------------------------------------

  async listServices(actor: Actor | null, tenantId: string): Promise<Service[]> {
    authorize(actor, "service:read", tenantId);
    // Clients only see bookable services; staff see archived ones too.
    const activeOnly = actor!.role === "client";
    return this.d.repos.services.listByTenant(tenantId, { activeOnly });
  }

  async createService(actor: Actor | null, input: CreateServiceInput): Promise<Service> {
    authorize(actor, "service:write", input.tenantId);
    if (input.durationMinutes % 15 !== 0 || input.durationMinutes < 15 || input.durationMinutes > 240) {
      throw new AppointmentError("VALIDATION_FAILED", "Duration must be a multiple of 15 minutes (15-240).");
    }
    const providers = await this.d.repos.providers.listByTenant(input.tenantId);
    for (const id of input.providerIds ?? []) {
      if (!providers.some((p) => p.id === id)) {
        throw new AppointmentError("TENANT_MISMATCH", "Provider does not belong to this organization.");
      }
    }
    const service = await this.d.repos.services.insert({
      id: newId("svc"),
      tenantId: input.tenantId,
      name: input.name.trim(),
      description: input.description?.trim() ?? "",
      durationMinutes: input.durationMinutes,
      priceCents: input.priceCents,
      currency: (input.currency ?? "USD").toUpperCase(),
      active: true,
      providerIds: input.providerIds ?? [],
    });
    await this.audit.record(actor!, {
      tenantId: input.tenantId,
      action: "service.created",
      entityType: "service",
      entityId: service.id,
      summary: `Added service ${service.name} (${service.durationMinutes} min)`,
    });
    return service;
  }

  async setServiceActive(actor: Actor | null, serviceId: string, active: boolean): Promise<Service> {
    const service = await this.d.repos.services.get(serviceId);
    if (!service) throw new AppointmentError("NOT_FOUND", "Service not found.");
    authorize(actor, "service:write", service.tenantId);
    const updated = await this.d.repos.services.update(serviceId, { active });
    await this.audit.record(actor!, {
      tenantId: service.tenantId,
      action: active ? "service.activated" : "service.archived",
      entityType: "service",
      entityId: serviceId,
      summary: `${active ? "Reactivated" : "Archived"} ${service.name}`,
    });
    return updated;
  }

  // ---- team & seats --------------------------------------------------------------------------

  async seatUsage(tenantId: string): Promise<{ used: number; limit: number }> {
    const tenant = await this.d.repos.tenants.get(tenantId);
    if (!tenant) throw new AppointmentError("NOT_FOUND", "Organization not found.");
    return {
      used: await this.d.repos.users.countSeats(tenantId),
      limit: PLANS[tenant.plan].limits.staffSeats,
    };
  }

  async listTeam(actor: Actor | null, tenantId: string): Promise<User[]> {
    authorize(actor, "staff:read", tenantId);
    const users = await this.d.repos.users.listByTenant(tenantId);
    return users.filter((u) => u.role === "owner" || u.role === "staff");
  }

  async inviteStaff(
    actor: Actor | null,
    tenantId: string,
    input: { name: string; email: string }
  ): Promise<User> {
    authorize(actor, "staff:invite", tenantId);
    const tenant = await this.d.repos.tenants.get(tenantId);
    if (!tenant) throw new AppointmentError("NOT_FOUND", "Organization not found.");

    const { used, limit } = await this.seatUsage(tenantId);
    if (used >= limit) {
      throw new AppointmentError(
        "SEAT_LIMIT",
        `Seat limit reached (${used}/${limit}) on the ${PLANS[tenant.plan].name} plan. Upgrade to add more staff.`,
        { used, limit, plan: tenant.plan }
      );
    }
    if (await this.d.repos.users.getByEmail(input.email)) {
      throw new AppointmentError("CONFLICT", "A user with this email already exists.");
    }
    const user = await this.d.repos.users.insert({
      id: newId("usr"),
      email: input.email.trim().toLowerCase(),
      name: input.name.trim(),
      role: "staff",
      tenantId,
      createdAt: this.d.now().toISOString(),
    });
    await this.audit.record(actor!, {
      tenantId,
      action: "user.invited",
      entityType: "user",
      entityId: user.id,
      summary: `Invited ${user.name} as staff`,
    });
    void this.notifier.staffInvite(tenant, user.name, user.email, actor!.name);
    return user;
  }
}
