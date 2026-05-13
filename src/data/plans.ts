import type { PlanDefinition } from "@/types";

export const PLANS: Record<string, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    seatLimit: 2,
    features: [
      "Up to 2 staff seats",
      "50 bookings / month",
      "Basic calendar",
      "Email reminders",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthly: 49,
    seatLimit: 10,
    stripePriceId: process.env.STRIPE_PRICE_PRO ?? "price_pro_mock",
    features: [
      "Up to 10 staff seats",
      "Unlimited bookings",
      "Stripe payments",
      "SMS reminders",
      "Custom branding",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    priceMonthly: 199,
    seatLimit: 100,
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE ?? "price_enterprise_mock",
    features: [
      "Unlimited seats",
      "SLA & dedicated support",
      "SSO / SAML",
      "API access",
      "Multi-location",
    ],
  },
};

export const PLAN_ORDER: Array<keyof typeof PLANS> = ["free", "pro", "enterprise"];