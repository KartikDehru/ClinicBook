import { NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/billing/checkout";
import { getTenantById } from "@/lib/tenants/resolve-tenant";
import { checkoutSchema } from "@/lib/validation/schemas";
import { canManageBilling } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid checkout request" }, { status: 400 });
  }

  const tenant = getTenantById(parsed.data.tenantId);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const user = await getCurrentUser();
  if (user && user.tenantId === tenant.id && !canManageBilling(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const session = await createCheckoutSession(
      tenant,
      parsed.data.plan,
      `${base}/billing/success?tenant=${tenant.slug}`,
      `${base}/t/${tenant.slug}/billing`
    );
    return NextResponse.json({
      sessionId: session.id,
      url: "url" in session ? session.url : null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Checkout failed" },
      { status: 500 }
    );
  }
}