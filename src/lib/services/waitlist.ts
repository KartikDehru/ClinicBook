import { AppointmentError } from "@/lib/errors";
import { authorize } from "@/lib/auth/rbac";
import { PLANS } from "@/lib/plans";
import { isValidLocalDate, localDateString } from "@/lib/time";
import { newId } from "@/lib/utils";
import type { Actor, Appointment, WaitlistEntry } from "@/types";
import type { AuditService } from "@/lib/services/audit";
import type { Deps } from "@/lib/services/deps";
import type { Notifier } from "@/lib/services/notifier";

export interface JoinWaitlistInput {
  tenantId: string;
  providerId: string;
  serviceId: string;
  customerId?: string;
  desiredDate: string;
  note?: string;
}

export class WaitlistService {
  constructor(
    private d: Deps,
    private audit: AuditService,
    private notifier: Notifier
  ) {}

  async list(actor: Actor | null, tenantId: string): Promise<WaitlistEntry[]> {
    authorize(actor, "waitlist:read", tenantId);
    return this.d.repos.waitlist.listByTenant(tenantId);
  }

  async join(actor: Actor | null, input: JoinWaitlistInput): Promise<WaitlistEntry> {
    authorize(actor, "waitlist:join", input.tenantId);
    const a = actor!;
    const { repos } = this.d;

    const tenant = await repos.tenants.get(input.tenantId);
    if (!tenant) throw new AppointmentError("NOT_FOUND", "Organization not found.");
    if (!PLANS[tenant.plan].limits.waitlist) {
      throw new AppointmentError(
        "PLAN_LIMIT",
        `The waitlist is available on the ${PLANS.pro.name} plan and above.`,
        { feature: "waitlist", plan: tenant.plan }
      );
    }
    if (!isValidLocalDate(input.desiredDate)) {
      throw new AppointmentError("VALIDATION_FAILED", "desiredDate must be YYYY-MM-DD.");
    }
    const today = localDateString(this.d.now(), tenant.timezone);
    if (input.desiredDate < today) {
      throw new AppointmentError("VALIDATION_FAILED", "Preferred date is in the past.");
    }

    const [provider, service] = await Promise.all([
      repos.providers.get(input.providerId),
      repos.services.get(input.serviceId),
    ]);
    if (!provider || !service) throw new AppointmentError("NOT_FOUND", "Provider or service not found.");
    if (provider.tenantId !== tenant.id || service.tenantId !== tenant.id) {
      throw new AppointmentError("TENANT_MISMATCH", "Provider or service belongs to another organization.");
    }

    let customerId = input.customerId;
    if (a.role === "client") {
      let own = await repos.customers.getByEmail(tenant.id, a.email);
      if (!own) {
        own = await repos.customers.insert({
          id: newId("cus"),
          tenantId: tenant.id,
          name: a.name,
          email: a.email,
          createdAt: this.d.now().toISOString(),
        });
      }
      customerId = own.id;
    }
    if (!customerId) throw new AppointmentError("VALIDATION_FAILED", "customerId is required.");
    const customer = await repos.customers.get(customerId);
    if (!customer) throw new AppointmentError("NOT_FOUND", "Customer not found.");
    if (customer.tenantId !== tenant.id) {
      throw new AppointmentError("TENANT_MISMATCH", "Customer belongs to another organization.");
    }

    const existing = (await repos.waitlist.listByTenant(tenant.id)).find(
      (w) =>
        w.customerId === customerId &&
        w.providerId === input.providerId &&
        w.desiredDate === input.desiredDate &&
        (w.status === "waiting" || w.status === "offered")
    );
    if (existing) {
      throw new AppointmentError("CONFLICT", "This customer is already on the waitlist for that day.");
    }

    const entry = await repos.waitlist.insert({
      id: newId("wl"),
      tenantId: tenant.id,
      providerId: input.providerId,
      serviceId: input.serviceId,
      customerId,
      desiredDate: input.desiredDate,
      note: input.note,
      status: "waiting",
      createdAt: this.d.now().toISOString(),
    });

    await this.audit.record(a, {
      tenantId: tenant.id,
      action: "waitlist.joined",
      entityType: "waitlist",
      entityId: entry.id,
      summary: `${customer.name} joined the waitlist for ${service.name} with ${provider.name} on ${input.desiredDate}`,
      after: { desiredDate: input.desiredDate },
    });
    void this.notifier.waitlistJoined(entry);
    return entry;
  }

  async remove(actor: Actor | null, id: string): Promise<WaitlistEntry> {
    const entry = await this.d.repos.waitlist.get(id);
    if (!entry) throw new AppointmentError("NOT_FOUND", "Waitlist entry not found.");
    authorize(actor, "waitlist:join", entry.tenantId);
    const a = actor!;

    if (a.role === "client") {
      const customer = await this.d.repos.customers.get(entry.customerId);
      if (!customer || customer.email.toLowerCase() !== a.email.toLowerCase()) {
        throw new AppointmentError("FORBIDDEN", "You can only remove your own waitlist entries.");
      }
    }
    const updated = await this.d.repos.waitlist.update(id, { status: "removed" });
    await this.audit.record(a, {
      tenantId: entry.tenantId,
      action: "waitlist.removed",
      entityType: "waitlist",
      entityId: id,
      summary: "Waitlist entry removed",
    });
    return updated;
  }

  /** When a slot frees up, offer it to the oldest matching waiting entry. */
  async offerFreedSlot(actor: Actor, freed: Appointment): Promise<WaitlistEntry | null> {
    const tenant = await this.d.repos.tenants.get(freed.tenantId);
    if (!tenant || !PLANS[tenant.plan].limits.waitlist) return null;
    const date = localDateString(new Date(freed.startsAt), tenant.timezone);
    const entries = await this.d.repos.waitlist.listByTenant(freed.tenantId);
    const match = entries.find(
      (w) => w.status === "waiting" && w.providerId === freed.providerId && w.desiredDate === date
    );
    if (!match) return null;

    const offered = await this.d.repos.waitlist.update(match.id, {
      status: "offered",
      offeredAt: this.d.now().toISOString(),
      offeredStartsAt: freed.startsAt,
    });
    await this.audit.record(actor, {
      tenantId: freed.tenantId,
      action: "waitlist.offered",
      entityType: "waitlist",
      entityId: match.id,
      summary: `Freed slot offered to waitlist entry ${match.id}`,
      after: { offeredStartsAt: freed.startsAt },
    });
    void this.notifier.waitlistOffer(offered, freed);
    return offered;
  }

  async markBooked(tenantId: string, customerId: string, providerId: string, localDate: string) {
    const entries = await this.d.repos.waitlist.listByTenant(tenantId);
    for (const e of entries) {
      if (
        e.customerId === customerId &&
        e.providerId === providerId &&
        e.desiredDate === localDate &&
        (e.status === "waiting" || e.status === "offered")
      ) {
        await this.d.repos.waitlist.update(e.id, { status: "booked" });
      }
    }
  }
}
