import { PLANS } from "@/data/plans";
import type { PlanTier, Tenant } from "@/types";
import { store } from "@/lib/store";

export function getSeatLimit(plan: PlanTier): number {
  return PLANS[plan].seatLimit;
}

export function getSeatUsage(tenantId: string): number {
  return store.users.filter(
    (u) => u.tenantId === tenantId && (u.role === "owner" || u.role === "staff")
  ).length;
}

export function canAddStaff(tenant: Tenant): boolean {
  const limit = getSeatLimit(tenant.plan);
  const used = getSeatUsage(tenant.id);
  return used < limit;
}

export function assertSeatAvailable(tenant: Tenant): void {
  if (!canAddStaff(tenant)) {
    throw new Error(
      `Seat limit reached (${getSeatUsage(tenant.id)}/${getSeatLimit(tenant.plan)}). Upgrade your plan.`
    );
  }
}