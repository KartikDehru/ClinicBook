import Stripe from "stripe";
import { env } from "@/lib/env";
import { AppointmentError } from "@/lib/errors";
import { logger } from "@/lib/logging";

export interface CheckoutParams {
  tenantId: string;
  tenantSlug: string;
  plan: "pro" | "enterprise";
  priceId: string;
  customerId?: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutResult {
  id: string;
  url: string | null;
  mock: boolean;
}

export interface StripeGateway {
  createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult>;
  cancelSubscription(subscriptionId: string): Promise<void>;
}

export class MockStripeGateway implements StripeGateway {
  async createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult> {
    const id = `cs_mock_${Date.now().toString(36)}`;
    return {
      id,
      mock: true,
      url: `${params.successUrl}${params.successUrl.includes("?") ? "&" : "?"}session_id=${id}`,
    };
  }
  async cancelSubscription(): Promise<void> {}
}

export class LiveStripeGateway implements StripeGateway {
  private stripe: Stripe;
  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey);
  }

  async createCheckoutSession(p: CheckoutParams): Promise<CheckoutResult> {
    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      customer: p.customerId,
      customer_email: p.customerId ? undefined : p.customerEmail,
      line_items: [{ price: p.priceId, quantity: 1 }],
      success_url: p.successUrl,
      cancel_url: p.cancelUrl,
      client_reference_id: p.tenantId,
      metadata: { tenantId: p.tenantId, plan: p.plan },
      subscription_data: { metadata: { tenantId: p.tenantId, plan: p.plan } },
    });
    return { id: session.id, url: session.url, mock: false };
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.stripe.subscriptions.cancel(subscriptionId);
  }
}

export function createStripeGateway(): StripeGateway {
  return env.STRIPE_MOCK ? new MockStripeGateway() : new LiveStripeGateway(env.STRIPE_SECRET_KEY);
}

export interface VerifiedEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

/**
 * Verifies a Stripe webhook.
 *  - secret configured  → signature is ALWAYS verified (live and mock mode); invalid/missing is rejected.
 *  - no secret + mock   → unsigned JSON accepted (local development only).
 *  - no secret + live   → rejected.
 */
export function verifyStripeWebhook(
  rawBody: string,
  signatureHeader: string | null,
  config: { secret?: string; mock: boolean }
): VerifiedEvent {
  if (config.secret) {
    if (!signatureHeader) {
      throw new AppointmentError("WEBHOOK_SIGNATURE", "Missing Stripe-Signature header.");
    }
    try {
      return Stripe.webhooks.constructEvent(rawBody, signatureHeader, config.secret) as unknown as VerifiedEvent;
    } catch (err) {
      throw new AppointmentError(
        "WEBHOOK_SIGNATURE",
        `Webhook signature verification failed: ${err instanceof Error ? err.message : "invalid signature"}`
      );
    }
  }

  if (!config.mock) {
    throw new AppointmentError("WEBHOOK_SIGNATURE", "Webhook secret is not configured.");
  }

  logger.warn("accepting unsigned webhook (mock mode, no STRIPE_WEBHOOK_SECRET)");
  try {
    const parsed = JSON.parse(rawBody) as Partial<VerifiedEvent>;
    if (!parsed.type || !parsed.data?.object) throw new Error("malformed event");
    return { id: parsed.id ?? `evt_mock_${Date.now()}`, type: parsed.type, data: parsed.data };
  } catch {
    throw new AppointmentError("VALIDATION_FAILED", "Webhook body is not a valid event.");
  }
}

/** Test/dev helper: produce a correctly signed header for `payload`. */
export function signStripePayload(payload: string, secret: string): string {
  return Stripe.webhooks.generateTestHeaderString({ payload, secret });
}
