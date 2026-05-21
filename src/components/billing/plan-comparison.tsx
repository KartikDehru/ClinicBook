import { PLANS, PLAN_ORDER } from "@/data/plans";
import type { PlanTier } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PlanComparisonProps {
  currentPlan: PlanTier;
  checkoutBasePath: string;
}

export function PlanComparison({ currentPlan, checkoutBasePath }: PlanComparisonProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {PLAN_ORDER.map((key) => {
        const plan = PLANS[key];
        const isCurrent = key === currentPlan;
        return (
          <Card key={key} className={isCurrent ? "border-brand-500 shadow-md" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{plan.name}</CardTitle>
                {isCurrent && <Badge>Current</Badge>}
              </div>
              <CardDescription>
                <span className="text-2xl font-bold text-slate-900">${plan.priceMonthly}</span>
                /mo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="mb-4 space-y-2 text-sm text-slate-600">
                {plan.features.map((f) => (
                  <li key={f}>✓ {f}</li>
                ))}
              </ul>
              {key === "free" ? (
                <Button variant="secondary" className="w-full" disabled>
                  Included
                </Button>
              ) : isCurrent ? (
                <Button variant="outline" className="w-full" disabled>
                  Active plan
                </Button>
              ) : (
                <form action={`${checkoutBasePath}?plan=${key}`} method="get">
                  <Button type="submit" className="w-full">
                    Upgrade to {plan.name}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}