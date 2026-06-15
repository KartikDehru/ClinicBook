import Link from "next/link";
import { AccessGate } from "@/components/layout/access-gate";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { RemoveWaitlistButton } from "@/components/tenant/forms";
import { loadTenantPage } from "@/lib/auth/page-guard";
import { getContainer } from "@/lib/container";
import { PLANS } from "@/lib/plans";
import { formatInZone, formatLocalDate } from "@/lib/time";
import type { WaitlistStatus } from "@/types";

const TONE: Record<WaitlistStatus, BadgeTone> = { waiting: "sand", offered: "teal", booked: "neutral", removed: "neutral" };

export default async function WaitlistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await loadTenantPage(slug, "waitlist:read");
  if (!ctx.ok) return <AccessGate ctx={ctx} path={`/t/${slug}/waitlist`} />;
  const { tenant, actor } = ctx;
  const c = getContainer();

  if (!PLANS[tenant.plan].limits.waitlist) {
    return (
      <>
        <PageHeader title="Waitlist" />
        <EmptyState
          title="The waitlist is part of the Practice plan"
          body="When a slot opens, the next matching person is offered it automatically."
          action={
            actor.role === "owner" || actor.role === "platform_admin" ? (
              <Button asChild>
                <Link href={`/t/${slug}/billing`}>View plans</Link>
              </Button>
            ) : undefined
          }
        />
      </>
    );
  }

  const [entries, customers, providers, services] = await Promise.all([
    c.waitlist.list(actor, tenant.id),
    c.repos.customers.listByTenant(tenant.id),
    c.repos.providers.listByTenant(tenant.id),
    c.repos.services.listByTenant(tenant.id),
  ]);
  const name = <T extends { id: string; name: string }>(rows: T[]) => new Map(rows.map((r) => [r.id, r.name]));
  const cust = name(customers);
  const prov = name(providers);
  const svc = name(services);
  const open = entries.filter((e) => e.status === "waiting" || e.status === "offered");
  const closed = entries.filter((e) => !open.includes(e)).reverse();

  const table = (rows: typeof entries, actions: boolean) => (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-ink-100 text-left text-xs font-bold uppercase tracking-wide text-ink-400">
            <th className="px-5 py-2.5">Customer</th>
            <th className="px-5 py-2.5">Service</th>
            <th className="px-5 py-2.5">Preferred day</th>
            <th className="px-5 py-2.5">Joined</th>
            <th className="px-5 py-2.5">Status</th>
            {actions && <th className="px-5 py-2.5" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {rows.map((e) => (
            <tr key={e.id}>
              <td className="px-5 py-3">
                <span className="block font-bold text-ink-900">{cust.get(e.customerId)}</span>
                {e.note && <span className="text-xs text-ink-500">{e.note}</span>}
              </td>
              <td className="px-5 py-3 text-ink-700">
                {svc.get(e.serviceId)}
                <span className="block text-xs text-ink-400">{prov.get(e.providerId)}</span>
              </td>
              <td className="px-5 py-3 tabular-nums text-ink-700">
                {formatLocalDate(e.desiredDate, { weekday: "short", month: "short", day: "numeric" })}
              </td>
              <td className="px-5 py-3 tabular-nums text-ink-500">{formatInZone(new Date(e.createdAt), tenant.timezone, "monthDay")}</td>
              <td className="px-5 py-3">
                <Badge tone={TONE[e.status]}>{e.status}</Badge>
                {e.offeredStartsAt && (
                  <span className="mt-1 block text-xs text-ink-500">
                    Offered {formatInZone(new Date(e.offeredStartsAt), tenant.timezone, "dayTime")}
                  </span>
                )}
              </td>
              {actions && (
                <td className="px-5 py-3 text-right">
                  <RemoveWaitlistButton entryId={e.id} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <PageHeader title="Waitlist" description="People waiting for an opening. Cancelled slots are offered to the oldest match." />
      <Card>
        <CardHeader title="Open" description={`${open.length} waiting or offered`} />
        {open.length === 0 ? (
          <div className="p-5">
            <EmptyState title="Nobody is waiting" body="When a day is fully booked, customers can join from the booking page." />
          </div>
        ) : (
          table(open, true)
        )}
      </Card>
      {closed.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Resolved" />
          {table(closed, false)}
        </Card>
      )}
    </>
  );
}
