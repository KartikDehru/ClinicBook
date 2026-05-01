import Link from "next/link";
import { applyPlanToTenant } from "@/lib/billing/checkout";
import { getTenantBySlug } from "@/lib/tenants/resolve-tenant";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string; session_id?: string }>;
}) {
  const params = await searchParams;
  const tenant = params.tenant ? getTenantBySlug(params.tenant) : undefined;

  if (tenant && tenant.plan === "free") {
    applyPlanToTenant(tenant.id, "pro", `sub_mock_${params.session_id ?? "success"}`);
  }

  return (
    <>
      <SiteHeader />
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Payment successful</h1>
        <p className="mt-2 text-slate-600">
          {tenant
            ? `${tenant.name} is now on the upgraded plan (demo mock).`
            : "Your subscription has been updated."}
        </p>
        {tenant && (
          <Button asChild className="mt-6">
            <Link href={`/t/${tenant.slug}/billing`}>Back to billing</Link>
          </Button>
        )}
      </div>
    </>
  );
}