import { applyPlanToTenant } from "@/lib/billing/checkout";
import { getStripeClient } from "@/lib/stripe/client";
import type { PlanTier } from "@/types";

export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): { type: string; data: { object: Record<string, unknown> } } {
  const stripe = getStripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_mock";
  const event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  return event as { type: string; data: { object: Record<string, unknown> } };
}

export async function handleStripeWebhookEvent(event: {
  type: string;
  data: { object: Record<string, unknown> };
}): Promise<{ handled: boolean; message: string }> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const tenantId = session.metadata as { tenantId?: string } | undefined;
      const meta = (session.metadata ?? {}) as Record<string, string>;
      const plan = (meta.plan ?? "pro") as PlanTier;
      if (meta.tenantId || tenantId?.tenantId) {
        applyPlanToTenant(meta.tenantId, plan, session.subscription as string | undefined);
      }
      return { handled: true, message: "Checkout completed — plan upgraded" };
    }
    case "customer.subscription.updated": {
      const sub = event.data.object;
      const meta = (sub.metadata ?? {}) as Record<string, string>;
      if (meta.tenantId && meta.plan) {
        applyPlanToTenant(meta.tenantId, meta.plan as PlanTier, sub.id as string);
      }
      return { handled: true, message: "Subscription updated" };
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const meta = (sub.metadata ?? {}) as Record<string, string>;
      if (meta.tenantId) {
        applyPlanToTenant(meta.tenantId, "free");
      }
      return { handled: true, message: "Subscription canceled — downgraded to free" };
    }
    default:
      return { handled: false, message: `Unhandled event: ${event.type}` };
  }
}