import { authorize } from "@/lib/auth/rbac";
import { PLANS } from "@/lib/plans";
import { startOfLocalMonth } from "@/lib/time";
import type {
  Actor,
  Appointment,
  PlanTier,
  SubscriptionStatus,
  Tenant,
  TenantVertical,
  WaitlistEntry,
} from "@/types";
import type { Deps } from "@/lib/services/deps";

export interface TenantRow {
  id: string;
  slug: string;
  name: string;
  vertical: TenantVertical;
  plan: PlanTier;
  status: SubscriptionStatus;
  timezone: string;
  mrr: number;
  bookingsThisMonth: number;
  conversion: number | null;
  seatsUsed: number;
  seatLimit: number;
  createdAt: string;
}

export interface PlatformMetrics {
  totalTenants: number;
  activeSubscriptions: number;
  mrr: number;
  arr: number;
  mrrByPlan: Record<PlanTier, number>;
  subscribersByPlan: Record<PlanTier, number>;
  churn: {
    churnedLast30d: number;
    churnedMrr: number;
    /** Stub: churned / (active paid at period start). Replace with cohort analysis from Stripe data. */
    ratePct: number;
  };
  bookings: {
    total: number;
    thisMonth: number;
    /** Share of created bookings that were honored (not cancelled and not a no-show). */
    conversionPct: number;
    cancellationPct: number;
    noShowPct: number;
  };
  waitlistOpen: number;
}

export interface MetricsInput {
  tenants: Tenant[];
  appointments: Appointment[];
  waitlist: WaitlistEntry[];
  seatCounts: Record<string, number>;
  now: Date;
}

const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 1000) / 10);

export function mrrOf(tenant: Pick<Tenant, "plan" | "subscriptionStatus">): number {
  if (tenant.subscriptionStatus === "canceled") return 0;
  return PLANS[tenant.plan].priceMonthly;
}

function bookingStats(appts: Appointment[]) {
  const honored = appts.filter((a) => a.status !== "cancelled" && a.status !== "no_show").length;
  return {
    conversion: appts.length === 0 ? null : pct(honored, appts.length),
    cancellationPct: pct(appts.filter((a) => a.status === "cancelled").length, appts.length),
    noShowPct: pct(appts.filter((a) => a.status === "no_show").length, appts.length),
  };
}

export function computePlatformMetrics(input: MetricsInput): PlatformMetrics {
  const { tenants, appointments, waitlist, now } = input;
  const subscribed = tenants.filter((t) => t.plan !== "free" && t.subscriptionStatus !== "canceled");
  const mrrByPlan: Record<PlanTier, number> = { free: 0, pro: 0, enterprise: 0 };
  const subscribersByPlan: Record<PlanTier, number> = { free: 0, pro: 0, enterprise: 0 };
  for (const t of tenants) {
    if (t.subscriptionStatus !== "canceled") subscribersByPlan[t.plan]++;
    mrrByPlan[t.plan] += mrrOf(t);
  }
  const mrr = subscribed.reduce((s, t) => s + mrrOf(t), 0);

  const cutoff = now.getTime() - 30 * 86_400_000;
  const churned = tenants.filter(
    (t) => t.canceledAt && Date.parse(t.canceledAt) >= cutoff && t.churnedFromPlan
  );
  const churnedMrr = churned.reduce((s, t) => s + PLANS[t.churnedFromPlan!].priceMonthly, 0);
  const paidAtStart = subscribed.length + churned.filter((t) => t.churnedFromPlan !== "free").length;

  const stats = bookingStats(appointments);
  const monthStarts = new Map<string, number>();
  for (const t of tenants) monthStarts.set(t.id, startOfLocalMonth(now, t.timezone).getTime());
  const thisMonth = appointments.filter(
    (a) => Date.parse(a.startsAt) >= (monthStarts.get(a.tenantId) ?? 0) && a.status !== "cancelled"
  ).length;

  return {
    totalTenants: tenants.length,
    activeSubscriptions: subscribed.length,
    mrr,
    arr: mrr * 12,
    mrrByPlan,
    subscribersByPlan,
    churn: { churnedLast30d: churned.length, churnedMrr, ratePct: pct(churned.length, paidAtStart) },
    bookings: {
      total: appointments.length,
      thisMonth,
      conversionPct: stats.conversion ?? 0,
      cancellationPct: stats.cancellationPct,
      noShowPct: stats.noShowPct,
    },
    waitlistOpen: waitlist.filter((w) => w.status === "waiting" || w.status === "offered").length,
  };
}

export interface TenantFilter {
  q?: string;
  plan?: PlanTier;
  vertical?: TenantVertical;
  status?: SubscriptionStatus;
}

export function buildTenantRows(input: MetricsInput, filter: TenantFilter = {}): TenantRow[] {
  const q = filter.q?.trim().toLowerCase();
  return input.tenants
    .filter(
      (t) =>
        (!filter.plan || t.plan === filter.plan) &&
        (!filter.vertical || t.vertical === filter.vertical) &&
        (!filter.status || t.subscriptionStatus === filter.status) &&
        (!q || t.name.toLowerCase().includes(q) || t.slug.includes(q))
    )
    .map((t) => {
      const monthStart = startOfLocalMonth(input.now, t.timezone).getTime();
      const mine = input.appointments.filter((a) => a.tenantId === t.id);
      const month = mine.filter((a) => Date.parse(a.startsAt) >= monthStart);
      return {
        id: t.id,
        slug: t.slug,
        name: t.name,
        vertical: t.vertical,
        plan: t.plan,
        status: t.subscriptionStatus,
        timezone: t.timezone,
        mrr: mrrOf(t),
        bookingsThisMonth: month.filter((a) => a.status !== "cancelled").length,
        conversion: bookingStats(month).conversion,
        seatsUsed: input.seatCounts[t.id] ?? 0,
        seatLimit: PLANS[t.plan].limits.staffSeats,
        createdAt: t.createdAt,
      };
    })
    .sort((a, b) => b.mrr - a.mrr || a.name.localeCompare(b.name));
}

export class MetricsService {
  constructor(private d: Deps) {}

  private async load(): Promise<MetricsInput> {
    const { repos } = this.d;
    const [tenants, appointments, waitlist] = await Promise.all([
      repos.tenants.list(),
      repos.appointments.listAll(),
      repos.waitlist.listAll(),
    ]);
    const seatCounts: Record<string, number> = {};
    for (const t of tenants) seatCounts[t.id] = await repos.users.countSeats(t.id);
    return { tenants, appointments, waitlist, seatCounts, now: this.d.now() };
  }

  async platform(actor: Actor | null, filter: TenantFilter = {}) {
    authorize(actor, "admin:read");
    const input = await this.load();
    return {
      metrics: computePlatformMetrics(input),
      rows: buildTenantRows(input, filter),
      recent: input.appointments
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice(0, 12)
        .map((a) => ({ ...a, tenantName: input.tenants.find((t) => t.id === a.tenantId)?.name ?? "" })),
    };
  }
}
