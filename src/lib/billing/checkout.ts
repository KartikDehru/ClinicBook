import { PLANS } from "@/data/plans";
import { getStripeClient } from "@/lib/stripe/client";
import { store } from "@/lib/store";
import type { PlanTier, Tenant } from "@/types";
import { getSeatLimit } from "@/lib/tenants/seat-limits";

export async function createCheckoutSession(
  tenant: Tenant,
  plan: PlanTier,
  successUrl: string,
  cancelUrl: string
) {
  if (plan === "free") {
    throw new Error("Cannot checkout for free tier");
  }

  const planDef = PLANS[plan];
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: tenant.stripeCustomerId,
    customer_email: tenant.stripeCustomerId ? undefined : `billing+${tenant.slug}@clinicbook.app`,
    line_items: [
      {
        price: planDef.stripePriceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      tenantId: tenant.id,
      plan,
    },
    subscription_data: {
      metadata: {
        tenantId: tenant.id,
        plan,
      },
    },
  });

  return session;
}

export function applyPlanToTenant(tenantId: string, plan: PlanTier, subscriptionId?: string) {
  const tenant = store.tenants.find((t) => t.id === tenantId);
  if (!tenant) return;

  tenant.plan = plan;
  tenant.seatCount = Math.min(tenant.seatCount, getSeatLimit(plan));
  if (subscriptionId) {
    tenant.stripeSubscriptionId = subscriptionId;
  }
}