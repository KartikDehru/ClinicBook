import { NextResponse } from "next/server";
import {
  handleStripeWebhookEvent,
  verifyWebhookSignature,
} from "@/lib/billing/webhooks";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  try {
    const event = verifyWebhookSignature(rawBody, signature);
    const result = await handleStripeWebhookEvent(event);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Webhook error" },
      { status: 400 }
    );
  }
}