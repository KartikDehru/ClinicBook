import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { PLANS, PLAN_ORDER } from "@/lib/plans";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-20">
        <h1 className="font-display text-5xl font-semibold text-ink-900">Pricing</h1>
        <p className="mt-4 max-w-xl text-lg text-ink-600">
          Priced per organization, not per patient. Limits are enforced by the platform: seats at
          invite time, bookings at checkout.
        </p>

        <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200 md:grid-cols-3">
          {PLAN_ORDER.map((key) => {
            const plan = PLANS[key];
            const featured = key === "pro";
            return (
              <section key={key} className={cn("flex flex-col bg-white p-8", featured && "bg-clinic-50")}>
                <h2 className="text-sm font-bold uppercase tracking-wide text-clinic-700">{plan.name}</h2>
                <p className="mt-4 font-display text-5xl font-semibold text-ink-900">
                  ${plan.priceMonthly}
                  <span className="text-base font-medium text-ink-500"> / month</span>
                </p>
                <ul className="mt-8 flex-1 space-y-3 text-sm text-ink-700">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-clinic-600" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button asChild variant={featured ? "default" : "outline"} className="mt-8">
                  <Link href="/demo">{key === "free" ? "Start free" : `Choose ${plan.name}`}</Link>
                </Button>
              </section>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
