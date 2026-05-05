import { SiteHeader } from "@/components/layout/site-header";
import { PLANS, PLAN_ORDER } from "@/data/plans";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="text-center text-3xl font-bold text-slate-900">Simple SaaS pricing</h1>
        <p className="mt-2 text-center text-slate-600">Seat limits scale with your team.</p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PLAN_ORDER.map((key) => {
            const plan = PLANS[key];
            return (
              <Card key={key}>
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-bold text-slate-900">${plan.priceMonthly}</span>
                    /month
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-sm text-slate-500">Up to {plan.seatLimit} staff seats</p>
                  <ul className="space-y-2 text-sm text-slate-600">
                    {plan.features.map((f) => (
                      <li key={f}>• {f}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}