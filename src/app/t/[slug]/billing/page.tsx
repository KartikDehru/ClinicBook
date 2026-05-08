import { notFound } from "next/navigation";
import { resolveTenantFromRequest } from "@/lib/tenants/resolve-tenant";
import { getSeatUsage, getSeatLimit } from "@/lib/tenants/seat-limits";
import { PlanComparison } from "@/components/billing/plan-comparison";
import { CheckoutButton } from "@/components/billing/checkout-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function BillingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await resolveTenantFromRequest(slug);
  if (!tenant) notFound();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Billing</h2>
        <p className="text-slate-600">Manage subscription and seat usage.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <p>
            Plan: <strong className="capitalize text-slate-900">{tenant.plan}</strong>
          </p>
          <p>
            Seats: {getSeatUsage(tenant.id)} / {getSeatLimit(tenant.plan)} used
          </p>
          {tenant.stripeSubscriptionId && (
            <p className="font-mono text-xs text-slate-400">{tenant.stripeSubscriptionId}</p>
          )}
          {tenant.plan === "free" && (
            <CheckoutButton tenantId={tenant.id} plan="pro" />
          )}
        </CardContent>
      </Card>

      <PlanComparison currentPlan={tenant.plan} checkoutBasePath={`/t/${slug}/billing/checkout`} />
    </div>
  );
}