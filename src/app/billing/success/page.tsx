import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/plans";
import type { PlanTier } from "@/types";

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string; plan?: string }>;
}) {
  const { tenant, plan } = await searchParams;
  const planName = plan && plan in PLANS ? PLANS[plan as PlanTier].name : "your new plan";
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-6 py-24">
        <h1 className="font-display text-4xl font-semibold text-ink-900">Subscription confirmed</h1>
        <p className="mt-4 text-ink-600">
          {planName} is active. Seat and booking limits update immediately; a receipt has been sent to the
          account owner.
        </p>
        <Button asChild className="mt-8">
          <Link href={tenant ? `/t/${tenant}/billing` : "/"}>Back to billing</Link>
        </Button>
      </main>
    </>
  );
}
