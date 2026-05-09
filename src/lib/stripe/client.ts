import Stripe from "stripe";

const useMock = !process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.startsWith("sk_test_mock");

export interface MockCheckoutSession {
  id: string;
  url: string;
  customer: string;
  subscription?: string;
  metadata: Record<string, string>;
}

export interface StripeClientLike {
  checkout: {
    sessions: {
      create(params: Stripe.Checkout.SessionCreateParams): Promise<Stripe.Checkout.Session | MockCheckoutSession>;
    };
  };
  subscriptions: {
    update(id: string, params: Stripe.SubscriptionUpdateParams): Promise<Stripe.Subscription | { id: string; status: string }>;
    cancel(id: string): Promise<Stripe.Subscription | { id: string; status: string }>;
  };
  webhooks: {
    constructEvent(payload: string, signature: string, secret: string): Stripe.Event | MockStripeEvent;
  };
}

export interface MockStripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

class MockStripeClient implements StripeClientLike {
  checkout = {
    sessions: {
      create: async (params: Stripe.Checkout.SessionCreateParams) => {
        const id = `cs_mock_${Date.now()}`;
        return {
          id,
          url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/billing/success?session_id=${id}`,
          customer: typeof params.customer === "string" ? params.customer : "cus_mock",
          subscription: params.mode === "subscription" ? `sub_mock_${Date.now()}` : undefined,
          metadata: (params.metadata as Record<string, string>) ?? {},
        } as MockCheckoutSession;
      },
    },
  };

  subscriptions = {
    update: async (id: string) => ({ id, status: "active" }),
    cancel: async (id: string) => ({ id, status: "canceled" }),
  };

  webhooks = {
    constructEvent: (payload: string, _signature: string, _secret: string) => {
      const parsed = JSON.parse(payload) as MockStripeEvent;
      return parsed;
    },
  };
}

let stripeInstance: Stripe | null = null;

export function getStripeClient(): StripeClientLike {
  if (useMock) {
    return new MockStripeClient();
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return stripeInstance as unknown as StripeClientLike;
}