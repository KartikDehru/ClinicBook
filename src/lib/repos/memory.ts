import { AppointmentError } from "@/lib/errors";
import type {
  Appointment,
  AuditEntry,
  Customer,
  Provider,
  Service,
  Tenant,
  User,
  WaitlistEntry,
} from "@/types";
import type {
  AppointmentRepository,
  AuditRepository,
  CustomerRepository,
  IdempotencyRecord,
  IdempotencyRepository,
  ProviderRepository,
  Repositories,
  SeedData,
  ServiceRepository,
  TenantRepository,
  UserRepository,
  WaitlistRepository,
  WebhookEventRepository,
} from "@/lib/repos/types";

const clone = <T>(v: T): T => structuredClone(v);

function requireRow<T>(row: T | undefined, what: string): T {
  if (!row) throw new AppointmentError("NOT_FOUND", `${what} not found.`);
  return row;
}

class MemoryTenants implements TenantRepository {
  constructor(private rows: Tenant[]) {}
  async get(id: string) {
    const r = this.rows.find((t) => t.id === id);
    return r && clone(r);
  }
  async getBySlug(slug: string) {
    const r = this.rows.find((t) => t.slug === slug || t.subdomain === slug);
    return r && clone(r);
  }
  async list() {
    return clone(this.rows);
  }
  async update(id: string, patch: Partial<Tenant>) {
    const r = requireRow(this.rows.find((t) => t.id === id), "Tenant");
    Object.assign(r, clone(patch));
    return clone(r);
  }
}

class MemoryUsers implements UserRepository {
  constructor(private rows: User[]) {}
  async get(id: string) {
    const r = this.rows.find((u) => u.id === id);
    return r && clone(r);
  }
  async getByEmail(email: string) {
    const r = this.rows.find((u) => u.email.toLowerCase() === email.toLowerCase());
    return r && clone(r);
  }
  async listByTenant(tenantId: string) {
    return clone(this.rows.filter((u) => u.tenantId === tenantId));
  }
  async listAll() {
    return clone(this.rows);
  }
  async insert(user: User) {
    this.rows.push(clone(user));
    return clone(user);
  }
  async countSeats(tenantId: string) {
    return this.rows.filter(
      (u) => u.tenantId === tenantId && (u.role === "owner" || u.role === "staff")
    ).length;
  }
}

class MemoryProviders implements ProviderRepository {
  constructor(private rows: Provider[]) {}
  async get(id: string) {
    const r = this.rows.find((p) => p.id === id);
    return r && clone(r);
  }
  async listByTenant(tenantId: string) {
    return clone(this.rows.filter((p) => p.tenantId === tenantId));
  }
}

class MemoryServices implements ServiceRepository {
  constructor(private rows: Service[]) {}
  async get(id: string) {
    const r = this.rows.find((s) => s.id === id);
    return r && clone(r);
  }
  async listByTenant(tenantId: string, opts?: { activeOnly?: boolean }) {
    return clone(
      this.rows.filter((s) => s.tenantId === tenantId && (!opts?.activeOnly || s.active))
    );
  }
  async insert(service: Service) {
    this.rows.push(clone(service));
    return clone(service);
  }
  async update(id: string, patch: Partial<Service>) {
    const r = requireRow(this.rows.find((s) => s.id === id), "Service");
    Object.assign(r, clone(patch));
    return clone(r);
  }
}

class MemoryCustomers implements CustomerRepository {
  constructor(private rows: Customer[]) {}
  async get(id: string) {
    const r = this.rows.find((c) => c.id === id);
    return r && clone(r);
  }
  async getByEmail(tenantId: string, email: string) {
    const r = this.rows.find(
      (c) => c.tenantId === tenantId && c.email.toLowerCase() === email.toLowerCase()
    );
    return r && clone(r);
  }
  async listByTenant(tenantId: string) {
    return clone(this.rows.filter((c) => c.tenantId === tenantId));
  }
  async insert(customer: Customer) {
    this.rows.push(clone(customer));
    return clone(customer);
  }
}

class MemoryAppointments implements AppointmentRepository {
  constructor(private rows: Appointment[]) {}

  private overlaps(a: Appointment, providerId: string, s: number, e: number, ignoreId?: string) {
    return (
      a.id !== ignoreId &&
      a.providerId === providerId &&
      a.status !== "cancelled" &&
      Date.parse(a.startsAt) < e &&
      Date.parse(a.endsAt) > s
    );
  }

  async get(id: string) {
    const r = this.rows.find((a) => a.id === id);
    return r && clone(r);
  }
  async list(q: import("@/lib/repos/types").AppointmentQuery) {
    const from = q.from ? Date.parse(q.from) : -Infinity;
    const to = q.to ? Date.parse(q.to) : Infinity;
    return clone(
      this.rows
        .filter(
          (a) =>
            a.tenantId === q.tenantId &&
            Date.parse(a.startsAt) >= from &&
            Date.parse(a.startsAt) < to &&
            (!q.providerId || a.providerId === q.providerId) &&
            (!q.customerId || a.customerId === q.customerId) &&
            (!q.status || a.status === q.status)
        )
        .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    );
  }
  async listAll() {
    return clone(this.rows);
  }
  async insertIfSlotFree(appointment: Appointment) {
    // Single synchronous section: check-and-insert cannot interleave on the event loop.
    const s = Date.parse(appointment.startsAt);
    const e = Date.parse(appointment.endsAt);
    if (this.rows.some((a) => this.overlaps(a, appointment.providerId, s, e))) return false;
    this.rows.push(clone(appointment));
    return true;
  }
  async moveIfSlotFree(id: string, startsAt: string, endsAt: string, updatedAt: string) {
    const r = requireRow(this.rows.find((a) => a.id === id), "Appointment");
    const s = Date.parse(startsAt);
    const e = Date.parse(endsAt);
    if (this.rows.some((a) => this.overlaps(a, r.providerId, s, e, id))) return null;
    r.startsAt = startsAt;
    r.endsAt = endsAt;
    r.updatedAt = updatedAt;
    return clone(r);
  }
  async update(id: string, patch: Partial<Appointment>) {
    const r = requireRow(this.rows.find((a) => a.id === id), "Appointment");
    Object.assign(r, clone(patch));
    return clone(r);
  }
}

class MemoryWaitlist implements WaitlistRepository {
  constructor(private rows: WaitlistEntry[]) {}
  async get(id: string) {
    const r = this.rows.find((w) => w.id === id);
    return r && clone(r);
  }
  async listByTenant(tenantId: string) {
    return clone(
      this.rows
        .filter((w) => w.tenantId === tenantId)
        .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    );
  }
  async listAll() {
    return clone(this.rows);
  }
  async insert(entry: WaitlistEntry) {
    this.rows.push(clone(entry));
    return clone(entry);
  }
  async update(id: string, patch: Partial<WaitlistEntry>) {
    const r = requireRow(this.rows.find((w) => w.id === id), "Waitlist entry");
    Object.assign(r, clone(patch));
    return clone(r);
  }
}

class MemoryAudit implements AuditRepository {
  constructor(private rows: AuditEntry[]) {}
  async append(entry: AuditEntry) {
    this.rows.push(clone(entry));
  }
  async list(tenantId: string, opts?: { entityId?: string; limit?: number; since?: string }) {
    const since = opts?.since ? Date.parse(opts.since) : -Infinity;
    const rows = this.rows
      .filter(
        (a) =>
          a.tenantId === tenantId &&
          Date.parse(a.at) >= since &&
          (!opts?.entityId || a.entityId === opts.entityId)
      )
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    return clone(opts?.limit ? rows.slice(0, opts.limit) : rows);
  }
}

class MemoryIdempotency implements IdempotencyRepository {
  private rows = new Map<string, IdempotencyRecord>();
  async get(key: string) {
    return this.rows.get(key);
  }
  async set(key: string, record: IdempotencyRecord) {
    this.rows.set(key, record);
  }
}

class MemoryWebhookEvents implements WebhookEventRepository {
  private seen = new Set<string>();
  async has(id: string) {
    return this.seen.has(id);
  }
  async add(id: string) {
    this.seen.add(id);
  }
}

export function createMemoryRepositories(seed: Partial<SeedData> = {}): Repositories {
  return {
    tenants: new MemoryTenants(clone(seed.tenants ?? [])),
    users: new MemoryUsers(clone(seed.users ?? [])),
    providers: new MemoryProviders(clone(seed.providers ?? [])),
    services: new MemoryServices(clone(seed.services ?? [])),
    customers: new MemoryCustomers(clone(seed.customers ?? [])),
    appointments: new MemoryAppointments(clone(seed.appointments ?? [])),
    waitlist: new MemoryWaitlist(clone(seed.waitlist ?? [])),
    audit: new MemoryAudit(clone(seed.audit ?? [])),
    idempotency: new MemoryIdempotency(),
    webhookEvents: new MemoryWebhookEvents(),
  };
}
