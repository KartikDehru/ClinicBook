import type { PlanDefinition, PlanTier } from "@/types";

export const PLANS: Record<PlanTier, PlanDefinition> = {
  free: {
    id: "free",
    name: "Starter",
    priceMonthly: 0,
    limits: { staffSeats: 2, bookingsPerMonth: 50, waitlist: false, auditLogDays: 7 },
    features: [
      "2 staff seats",
      "50 bookings per month",
      "Week calendar and customer records",
      "Email confirmations",
      "7-day activity log",
    ],
  },
  pro: {
    id: "pro",
    name: "Practice",
    priceMonthly: 49,
    limits: { staffSeats: 10, bookingsPerMonth: null, waitlist: true, auditLogDays: 90 },
    features: [
      "10 staff seats",
      "Unlimited bookings",
      "Automatic waitlist with slot offers",
      "Service catalog with pricing",
      "90-day activity log",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Network",
    priceMonthly: 199,
    limits: { staffSeats: 100, bookingsPerMonth: null, waitlist: true, auditLogDays: 365 },
    features: [
      "100 staff seats",
      "Everything in Practice",
      "Multi-location support",
      "SSO and SCIM provisioning",
      "365-day activity log and API access",
    ],
  },
};

export const PLAN_ORDER: PlanTier[] = ["free", "pro", "enterprise"];

export function getPlan(tier: PlanTier): PlanDefinition {
  return PLANS[tier];
}
