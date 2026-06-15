import { Check } from "lucide-react";
import { AccessGate } from "@/components/layout/access-gate";
import { CheckoutButton } from "@/components/billing/checkout-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { loadTenantPage } from "@/lib/auth/page-guard";
import { getContainer } from "@/lib/container";
import { PLANS, PLAN_ORDER } from "@/lib/plans";
import { formatLocalDate, localDateString, startOfLocalDay, startOfLocalMonth } from "@/lib/time";
import { cn } from "@/lib/utils";

export default async function BillingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await loadTenantPage(slug, "billing:read");
  if (!ctx.ok) return <AccessGate ctx={ctx} path={`/t/${slug}/billing`} />;
  const { tenant } = ctx;
  const c = getContainer();
  const plan = PLANS[tenant.plan];
  const seats = await c.tenantAdmin.seatUsage(tenant.id);

  const tz = tenant.timezone;
  const now = new Date();
  const monthStart = startOfLocalMonth(now, tz);
  const [y, m] = localDateString(now, tz).split("-").map(Number);
  const nextMonth = m === 12 ? `${y! + 1}-01-01` : `${y}-${String(m! + 1).padStart(2, "0")}-01`;
  const monthAppts = await c.repos.appointments.list({
    tenantId: tenant.id,
    from: monthStart.toISOString(),
    to: startOfLocalDay(nextMonth, tz).toISOString(),
  });
  const bookingsUsed = monthAppts.filter((a) => a.status !== "cancelled").length;
  const cap = plan.limits.bookingsPerMonth;
  const renews = formatLocalDate(nextMonth, { month: "long", day: "numeric" });

  const meter = (used: number, limit: number | null) => (
    <div className="mt-2 h-2 overflow-hidden rounded-sm bg-ink-100">
      <div
        className={cn("h-full", limit && used / limit > 0.85 ? "bg-signal-amber" : "bg-clinic-600")}
        style={{ width: limit ? `${Math.min(100, (used / limit) * 100)}%` : "8%" }}
      />
    </div>
  );

  return (
    <>
      <PageHeader title="Billing" description="Subscription, usage and plan limits." />

      <Card>
        <CardHeader
          title={`${plan.name} plan`}
          description={tenant.subscriptionStatus === "past_due" ? "Payment is past due" : plan.priceMonthly ? `$${plan.priceMonthly} per month · renews ${renews}` : "Free forever"}
          action={<Badge tone={tenant.subscriptionStatus === "active" ? "teal" : tenant.subscriptionStatus === "past_due" ? "red" : "sand"}>{tenant.subscriptionStatus.replace("_", " ")}</Badge>}
        />
        <CardBody className="grid gap-8 sm:grid-cols-2">
          <div>
            <p className="flex justify-between text-sm">
              <span className="font-bold text-ink-900">Staff seats</span>
              <span className="tabular-nums text-ink-600">{seats.used} of {seats.limit}</span>
            </p>
            {meter(seats.used, seats.limit)}
          </div>
          <div>
            <p className="flex justify-between text-sm">
              <span className="font-bold text-ink-900">Bookings this month</span>
              <span className="tabular-nums text-ink-600">{bookingsUsed}{cap ? ` of ${cap}` : " · unlimited"}</span>
            </p>
            {meter(bookingsUsed, cap)}
          </div>
        </CardBody>
        {tenant.stripeSubscriptionId && (
          <p className="border-t border-ink-100 px-5 py-3 font-mono text-xs text-ink-400">{tenant.stripeSubscriptionId}</p>
        )}
      </Card>

      <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200 md:grid-cols-3">
        {PLAN_ORDER.map((key) => {
          const p = PLANS[key];
          const current = key === tenant.plan;
          return (
            <section key={key} className={cn("flex flex-col bg-white p-6", current && "bg-clinic-50")}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wide text-clinic-700">{p.name}</h2>
                {current && <Badge tone="teal">Current</Badge>}
              </div>
              <p className="mt-3 font-display text-4xl font-semibold text-ink-900">
                ${p.priceMonthly}
                <span className="text-sm font-medium text-ink-500"> / mo</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm text-ink-700">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-clinic-600" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {key === "free" ? (
                  <Button className="w-full" variant="outline" disabled>
                    {current ? "Current plan" : "Included"}
                  </Button>
                ) : current ? (
                  <Button className="w-full" variant="outline" disabled>
                    Current plan
                  </Button>
                ) : (
                  <CheckoutButton tenantId={tenant.id} plan={key} label={`Switch to ${p.name}`} />
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
