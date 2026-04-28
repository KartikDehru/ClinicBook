export type PlanTier = "free" | "pro" | "enterprise";

export type UserRole = "owner" | "staff" | "client" | "platform_admin";

export type TenantVertical = "clinic" | "gym" | "tutor";

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export interface PlanDefinition {
  id: PlanTier;
  name: string;
  priceMonthly: number;
  seatLimit: number;
  features: string[];
  stripePriceId?: string;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  vertical: TenantVertical;
  subdomain: string;
  plan: PlanTier;
  seatCount: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: string;
  timezone: string;
  accentColor: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string;
  avatarUrl?: string;
}

export interface Provider {
  id: string;
  tenantId: string;
  name: string;
  title: string;
  bio: string;
  avatarUrl: string;
  specialties: string[];
}

export interface AvailabilitySlot {
  id: string;
  providerId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
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
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  serviceName: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingInvoice {
  id: string;
  tenantId: string;
  amount: number;
  currency: string;
  status: "paid" | "open" | "void";
  periodStart: string;
  periodEnd: string;
}

export interface PlatformMetrics {
  totalTenants: number;
  activeSubscriptions: number;
  mrr: number;
  bookingsThisMonth: number;
  cancellationRate: number;
}