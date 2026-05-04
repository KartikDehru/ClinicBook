import { getStripeClient } from "@/lib/stripe/client";
import { getTenantById } from "@/lib/tenants/resolve-tenant";
import { applyPlanToTenant } from "@/lib/billing/checkout";

export async function cancelTenantSubscription(tenantId: string) {
  const tenant = getTenantById(tenantId);
  if (!tenant?.stripeSubscriptionId) {
    applyPlanToTenant(tenantId, "free");
    return { status: "downgraded" };
  }

  const stripe = getStripeClient();
  await stripe.subscriptions.cancel(tenant.stripeSubscriptionId);
  applyPlanToTenant(tenantId, "free");
  return { status: "canceled" };
}