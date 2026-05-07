import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { resolveTenantFromRequest } from "@/lib/tenants/resolve-tenant";
import { createCheckoutSession } from "@/lib/billing/checkout";
import type { PlanTier } from "@/types";

export default async function BillingCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ plan?: string }>;
}) {
  const { slug } = await params;
  const { plan } = await searchParams;
  const tenant = await resolveTenantFromRequest(slug);
  if (!tenant) notFound();

  const tier = (plan === "enterprise" ? "enterprise" : "pro") as PlanTier;
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await createCheckoutSession(
    tenant,
    tier,
    `${base}/billing/success?tenant=${tenant.slug}`,
    `${base}/t/${tenant.slug}/billing`
  );

  const url = "url" in session ? session.url : null;
  if (url) redirect(url);
  redirect(`/billing/success?tenant=${tenant.slug}`);
}