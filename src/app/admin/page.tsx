import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { EmptyState, PageHeader, Stat } from "@/components/ui/page";
import { StatusBadge } from "@/components/ui/status";
import { getActor } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { getContainer } from "@/lib/container";
import { PLANS, PLAN_ORDER } from "@/lib/plans";
import { formatInZone } from "@/lib/time";
import { formatMoney } from "@/lib/utils";
import type { PlanTier, SubscriptionStatus, TenantVertical } from "@/types";

export const metadata: Metadata = { title: "Platform admin" };
export const dynamic = "force-dynamic";

const VERTICALS: TenantVertical[] = ["clinic", "dental", "physio", "gym", "tutor"];
const STATUSES: SubscriptionStatus[] = ["active", "trialing", "past_due", "canceled"];
const STATUS_TONE: Record<SubscriptionStatus, BadgeTone> = { active: "teal", trialing: "sand", past_due: "red", canceled: "neutral" };

const pick = <T extends string>(v: string | undefined, allowed: readonly T[]): T | undefined =>
  allowed.includes(v as T) ? (v as T) : undefined;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; plan?: string; vertical?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const actor = await getActor();

  if (!can(actor, "admin:read")) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-md px-6 py-24 text-center">
          <h1 className="font-display text-3xl font-semibold text-ink-900">Platform admin</h1>
          <p className="mt-3 text-ink-600">
            {actor ? "This area is limited to ClinicBook platform staff." : "Sign in as a platform admin to continue."}
          </p>
          <Button asChild className="mt-6">
            <Link href="/demo?next=/admin">Sign in</Link>
          </Button>
        </main>
      </>
    );
  }

  const filter = {
    q: sp.q,
    plan: pick<PlanTier>(sp.plan, PLAN_ORDER),
    vertical: pick(sp.vertical, VERTICALS),
    status: pick(sp.status, STATUSES),
  };
  const { metrics, rows, recent } = await getContainer().metrics.platform(actor, filter);
  const filtered = Boolean(filter.q || filter.plan || filter.vertical || filter.status);
  const mrrMax = Math.max(1, ...PLAN_ORDER.map((p) => metrics.mrrByPlan[p]));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <PageHeader title="Platform" description="Revenue, retention and booking health across every tenant." />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Stat label="MRR" value={`$${metrics.mrr.toLocaleString()}`} note={`ARR $${metrics.arr.toLocaleString()}`} />
          <Stat label="Paying tenants" value={metrics.activeSubscriptions} note={`of ${metrics.totalTenants} total`} />
          <Stat
            label="Churn (30d)"
            value={`${metrics.churn.ratePct}%`}
            note={`${metrics.churn.churnedLast30d} lost · −$${metrics.churn.churnedMrr} MRR`}
          />
          <Stat label="Booking conversion" value={`${metrics.bookings.conversionPct}%`} note="Honored of all created" />
          <Stat label="Bookings this month" value={metrics.bookings.thisMonth} note={`${metrics.bookings.total} all time`} />
          <Stat label="Waitlist depth" value={metrics.waitlistOpen} note="Waiting or offered" />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="MRR by plan" description="Churn is a stub: trailing 30-day cancellations over paying tenants." />
            <ul className="space-y-4 p-5">
              {PLAN_ORDER.map((p) => (
                <li key={p}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-bold text-ink-900">
                      {PLANS[p].name} <span className="font-normal text-ink-400">· {metrics.subscribersByPlan[p]} tenants</span>
                    </span>
                    <span className="tabular-nums text-ink-700">${metrics.mrrByPlan[p]}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-sm bg-ink-100">
                    <div className="h-full bg-clinic-700" style={{ width: `${(metrics.mrrByPlan[p] / mrrMax) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Booking outcomes" description="Share of all appointments by result" />
            <ul className="space-y-4 p-5">
              {[
                { label: "Honored", pct: metrics.bookings.conversionPct, bar: "bg-clinic-700" },
                { label: "Cancelled", pct: metrics.bookings.cancellationPct, bar: "bg-signal-red" },
                { label: "No-show", pct: metrics.bookings.noShowPct, bar: "bg-signal-amber" },
              ].map((r) => (
                <li key={r.label}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-bold text-ink-900">{r.label}</span>
                    <span className="tabular-nums text-ink-700">{r.pct}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-sm bg-ink-100">
                    <div className={`h-full ${r.bar}`} style={{ width: `${r.pct}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader
            title="Tenants"
            description={`${rows.length} shown`}
            action={
              <form className="flex flex-wrap items-center gap-2" method="get">
                <input
                  name="q"
                  defaultValue={sp.q}
                  placeholder="Search name or slug"
                  className="w-48 rounded-md border border-ink-200 px-3 py-2 text-sm"
                />
                <Select name="plan" defaultValue={filter.plan ?? ""} className="w-36" aria-label="Plan">
                  <option value="">All plans</option>
                  {PLAN_ORDER.map((p) => (
                    <option key={p} value={p}>
                      {PLANS[p].name}
                    </option>
                  ))}
                </Select>
                <Select name="vertical" defaultValue={filter.vertical ?? ""} className="w-36" aria-label="Vertical">
                  <option value="">All verticals</option>
                  {VERTICALS.map((v) => (
                    <option key={v} value={v} className="capitalize">
                      {v}
                    </option>
                  ))}
                </Select>
                <Select name="status" defaultValue={filter.status ?? ""} className="w-36" aria-label="Status">
                  <option value="">Any status</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </Select>
                <Button type="submit" variant="dark">
                  Filter
                </Button>
                {filtered && (
                  <Button asChild variant="ghost">
                    <Link href="/admin">Clear</Link>
                  </Button>
                )}
              </form>
            }
          />
          {rows.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No tenants match" body="Adjust or clear the filters." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-left text-xs font-bold uppercase tracking-wide text-ink-400">
                    <th className="px-5 py-2.5">Organization</th>
                    <th className="px-5 py-2.5">Plan</th>
                    <th className="px-5 py-2.5">Status</th>
                    <th className="px-5 py-2.5 text-right">MRR</th>
                    <th className="px-5 py-2.5 text-right">Bookings (mo)</th>
                    <th className="px-5 py-2.5 text-right">Conversion</th>
                    <th className="px-5 py-2.5 text-right">Seats</th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {rows.map((t) => (
                    <tr key={t.id}>
                      <td className="px-5 py-3">
                        <span className="block font-bold text-ink-900">{t.name}</span>
                        <span className="text-xs capitalize text-ink-400">
                          {t.vertical} · {t.timezone.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={t.plan === "free" ? "neutral" : "teal"}>{PLANS[t.plan].name}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={STATUS_TONE[t.status]}>{t.status.replace("_", " ")}</Badge>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">${t.mrr}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{t.bookingsThisMonth}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{t.conversion === null ? "·" : `${t.conversion}%`}</td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {t.seatsUsed}/{t.seatLimit}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link href={`/t/${t.slug}`} className="font-semibold text-clinic-700 hover:underline">
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="mt-6">
          <CardHeader title="Latest bookings" description="Newest created across all tenants" />
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs font-bold uppercase tracking-wide text-ink-400">
                  <th className="px-5 py-2.5">Service</th>
                  <th className="px-5 py-2.5">Tenant</th>
                  <th className="px-5 py-2.5">Starts (tenant time)</th>
                  <th className="px-5 py-2.5 text-right">Price</th>
                  <th className="px-5 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {recent.map((a) => {
                  const tz = rows.find((r) => r.id === a.tenantId)?.timezone ?? "UTC";
                  return (
                    <tr key={a.id}>
                      <td className="px-5 py-3 font-semibold text-ink-900">{a.serviceName}</td>
                      <td className="px-5 py-3 text-ink-700">{a.tenantName}</td>
                      <td className="px-5 py-3 tabular-nums text-ink-600">{formatInZone(new Date(a.startsAt), tz, "dayTime")}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{formatMoney(a.priceCents, a.currency)}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={a.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </>
  );
}
