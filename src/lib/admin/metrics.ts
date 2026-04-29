import { PLANS } from "@/data/plans";
import { store } from "@/lib/store";
import type { BillingInvoice, PlatformMetrics } from "@/types";
import { startOfMonth, isAfter, parseISO } from "date-fns";

export function computePlatformMetrics(): PlatformMetrics {
  const monthStart = startOfMonth(new Date());
  const paidTenants = store.tenants.filter((t) => t.plan !== "free");
  const mrr = paidTenants.reduce((sum, t) => sum + PLANS[t.plan].priceMonthly, 0);
  const bookingsThisMonth = store.appointments.filter(
    (a) => isAfter(parseISO(a.createdAt), monthStart) && a.status !== "cancelled"
  ).length;
  const cancelled = store.appointments.filter((a) => a.status === "cancelled").length;
  const total = store.appointments.length || 1;

  return {
    totalTenants: store.tenants.length,
    activeSubscriptions: paidTenants.length,
    mrr,
    bookingsThisMonth,
    cancellationRate: Math.round((cancelled / total) * 1000) / 10,
  };
}

export function getTenantRevenueBreakdown() {
  return store.tenants.map((t) => ({
    tenantId: t.id,
    name: t.name,
    plan: t.plan,
    mrr: PLANS[t.plan].priceMonthly,
    vertical: t.vertical,
  }));
}

export function listRecentInvoices(): BillingInvoice[] {
  const now = new Date();
  return store.tenants
    .filter((t) => t.plan !== "free")
    .map((t) => ({
      id: `inv_${t.id}`,
      tenantId: t.id,
      amount: PLANS[t.plan].priceMonthly * 100,
      currency: "usd",
      status: "paid" as const,
      periodStart: startOfMonth(now).toISOString(),
      periodEnd: now.toISOString(),
    }));
}