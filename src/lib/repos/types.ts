import type {
  Appointment,
  AppointmentStatus,
  AuditEntry,
  Customer,
  Provider,
  Service,
  Tenant,
  User,
  WaitlistEntry,
} from "@/types";

/**
 * Persistence ports. Services depend only on these interfaces, so the in-memory
 * adapter in `memory.ts` can be replaced by Postgres (Prisma/Drizzle/Kysely) without touching
 * domain logic. Methods are async and return copies, matching real database semantics.
 */

export interface TenantRepository {
  get(id: string): Promise<Tenant | undefined>;
  getBySlug(slugOrSubdomain: string): Promise<Tenant | undefined>;
  list(): Promise<Tenant[]>;
  update(id: string, patch: Partial<Tenant>): Promise<Tenant>;
}

export interface UserRepository {
  get(id: string): Promise<User | undefined>;
  getByEmail(email: string): Promise<User | undefined>;
  listByTenant(tenantId: string): Promise<User[]>;
  listAll(): Promise<User[]>;
  insert(user: User): Promise<User>;
  /** Owners + staff (billable seats). */
  countSeats(tenantId: string): Promise<number>;
}

export interface ProviderRepository {
  get(id: string): Promise<Provider | undefined>;
  listByTenant(tenantId: string): Promise<Provider[]>;
}

export interface ServiceRepository {
  get(id: string): Promise<Service | undefined>;
  listByTenant(tenantId: string, opts?: { activeOnly?: boolean }): Promise<Service[]>;
  insert(service: Service): Promise<Service>;
  update(id: string, patch: Partial<Service>): Promise<Service>;
}

export interface CustomerRepository {
  get(id: string): Promise<Customer | undefined>;
  getByEmail(tenantId: string, email: string): Promise<Customer | undefined>;
  listByTenant(tenantId: string): Promise<Customer[]>;
  insert(customer: Customer): Promise<Customer>;
}

export interface AppointmentQuery {
  tenantId: string;
  from?: string;
  to?: string;
  providerId?: string;
  customerId?: string;
  status?: AppointmentStatus;
}

export interface AppointmentRepository {
  get(id: string): Promise<Appointment | undefined>;
  list(query: AppointmentQuery): Promise<Appointment[]>;
  listAll(): Promise<Appointment[]>;
  /**
   * Atomically inserts unless a live appointment overlaps for the same provider.
   * Postgres: `EXCLUDE USING gist (provider_id WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE (status <> 'cancelled')`.
   */
  insertIfSlotFree(appointment: Appointment): Promise<boolean>;
  /** Atomically moves an appointment; returns null when the new range collides. */
  moveIfSlotFree(id: string, startsAt: string, endsAt: string, updatedAt: string): Promise<Appointment | null>;
  update(id: string, patch: Partial<Appointment>): Promise<Appointment>;
}

export interface WaitlistRepository {
  get(id: string): Promise<WaitlistEntry | undefined>;
  listByTenant(tenantId: string): Promise<WaitlistEntry[]>;
  listAll(): Promise<WaitlistEntry[]>;
  insert(entry: WaitlistEntry): Promise<WaitlistEntry>;
  update(id: string, patch: Partial<WaitlistEntry>): Promise<WaitlistEntry>;
}

export interface AuditRepository {
  append(entry: AuditEntry): Promise<void>;
  list(tenantId: string, opts?: { entityId?: string; limit?: number; since?: string }): Promise<AuditEntry[]>;
}

export interface IdempotencyRecord {
  fingerprint: string;
  response: unknown;
  createdAt: number;
}

export interface IdempotencyRepository {
  get(scopedKey: string): Promise<IdempotencyRecord | undefined>;
  set(scopedKey: string, record: IdempotencyRecord): Promise<void>;
}

export interface WebhookEventRepository {
  has(eventId: string): Promise<boolean>;
  add(eventId: string): Promise<void>;
}

export interface Repositories {
  tenants: TenantRepository;
  users: UserRepository;
  providers: ProviderRepository;
  services: ServiceRepository;
  customers: CustomerRepository;
  appointments: AppointmentRepository;
  waitlist: WaitlistRepository;
  audit: AuditRepository;
  idempotency: IdempotencyRepository;
  webhookEvents: WebhookEventRepository;
}

export interface SeedData {
  tenants: Tenant[];
  users: User[];
  providers: Provider[];
  services: Service[];
  customers: Customer[];
  appointments: Appointment[];
  waitlist: WaitlistEntry[];
  audit: AuditEntry[];
}
