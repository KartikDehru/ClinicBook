export type PlanTier = "free" | "pro" | "enterprise";

export type UserRole = "owner" | "staff" | "client" | "platform_admin";

export type TenantVertical = "clinic" | "gym" | "tutor" | "dental" | "physio";

export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled";

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

/** One contiguous opening window per weekday, expressed in the tenant's local time. */
export interface DayHours {
  /** 0 = Sunday … 6 = Saturday */
  day: number;
  /** `HH:mm`, null when closed */
  open: string | null;
  close: string | null;
}

export interface PlanLimits {
  staffSeats: number;
  /** null = unlimited */
  bookingsPerMonth: number | null;
  waitlist: boolean;
  auditLogDays: number;
}

export interface PlanDefinition {
  id: PlanTier;
  name: string;
  /** Whole currency units (USD) per month. */
  priceMonthly: number;
  limits: PlanLimits;
  features: string[];
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  vertical: TenantVertical;
  subdomain: string;
  plan: PlanTier;
  subscriptionStatus: SubscriptionStatus;
  /** IANA zone, e.g. America/Los_Angeles */
  timezone: string;
  accentColor: string;
  businessHours: DayHours[];
  cancellationPolicy: string;
  /** Clients may not self-cancel inside this window. 0 = always allowed. */
  cancellationWindowHours: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: string;
  canceledAt?: string;
  /** Plan the tenant was on when it cancelled; used for churned-MRR reporting. */
  churnedFromPlan?: PlanTier;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  /** null for platform admins */
  tenantId: string | null;
  createdAt: string;
}

export interface AvailabilityWindow {
  dayOfWeek: number;
  start: string;
  end: string;
}

export interface Provider {
  id: string;
  tenantId: string;
  name: string;
  title: string;
  bio: string;
  specialties: string[];
  availability: AvailabilityWindow[];
}

export interface Service {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceCents: number;
  currency: string;
  active: boolean;
  /** Empty = offered by every provider. */
  providerIds: string[];
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  tenantId: string;
  providerId: string;
  customerId: string;
  serviceId: string;
  /** Snapshot of the service at booking time. */
  serviceName: string;
  priceCents: number;
  currency: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  notes?: string;
  cancelReason?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type WaitlistStatus = "waiting" | "offered" | "booked" | "removed";

export interface WaitlistEntry {
  id: string;
  tenantId: string;
  providerId: string;
  serviceId: string;
  customerId: string;
  /** Local date (tenant tz) the customer would like, `YYYY-MM-DD` */
  desiredDate: string;
  note?: string;
  status: WaitlistStatus;
  createdAt: string;
  offeredAt?: string;
  offeredStartsAt?: string;
}

export interface AuditEntry {
  id: string;
  tenantId: string;
  at: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: "appointment" | "waitlist" | "tenant" | "service" | "user" | "customer" | "billing";
  entityId: string;
  summary: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export interface Actor {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
}
