import { getContainer } from "@/lib/container";
import { apiRoute } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Stripe calls this directly: no session auth, authenticity comes from the signature. */
export const POST = apiRoute(
  async ({ request, json }) => {
    // The signature covers the exact bytes, so read the raw text body.
    const rawBody = await request.text();
    const result = await getContainer().billing.handleWebhook(
      rawBody,
      request.headers.get("stripe-signature")
    );
    return json(result);
  },
  { auth: false, name: "/api/webhooks/stripe" }
);
