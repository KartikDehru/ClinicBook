import Link from "next/link";
import { AccessGate } from "@/components/layout/access-gate";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { InviteStaffForm } from "@/components/tenant/forms";
import { can, roleLabel } from "@/lib/auth/rbac";
import { loadTenantPage } from "@/lib/auth/page-guard";
import { getContainer } from "@/lib/container";
import { PLANS } from "@/lib/plans";
import { format12h } from "@/lib/time";
import { initials } from "@/lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await loadTenantPage(slug, "staff:read");
  if (!ctx.ok) return <AccessGate ctx={ctx} path={`/t/${slug}/team`} />;
  const { tenant, actor } = ctx;
  const c = getContainer();
  const [team, providers, seats] = await Promise.all([
    c.tenantAdmin.listTeam(actor, tenant.id),
    c.repos.providers.listByTenant(tenant.id),
    c.tenantAdmin.seatUsage(tenant.id),
  ]);
  const full = seats.used >= seats.limit;
  const canInvite = can(actor, "staff:invite");

  return (
    <>
      <PageHeader title="Team" description="Staff seats and provider availability." />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Seats"
              description={`${PLANS[tenant.plan].name} plan includes ${seats.limit} staff seats`}
              action={<span className="font-display text-2xl font-semibold tabular-nums">{seats.used}/{seats.limit}</span>}
            />
            <CardBody>
              <div className="h-2 overflow-hidden rounded-sm bg-ink-100">
                <div
                  className={full ? "h-full bg-signal-amber" : "h-full bg-clinic-600"}
                  style={{ width: `${Math.min(100, (seats.used / seats.limit) * 100)}%` }}
                />
              </div>
              {full && (
                <p className="mt-3 text-sm text-ink-600">
                  All seats are in use.{" "}
                  {canInvite && (
                    <Link href={`/t/${slug}/billing`} className="font-semibold text-clinic-700 hover:underline">
                      Upgrade to add more.
                    </Link>
                  )}
                </p>
              )}
            </CardBody>
            <ul className="divide-y divide-ink-100 border-t border-ink-100">
              {team.map((u) => (
                <li key={u.id} className="flex items-center gap-4 px-5 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-clinic-100 text-xs font-bold text-clinic-800">
                    {initials(u.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink-900">{u.name}</p>
                    <p className="truncate text-xs text-ink-500">{u.email}</p>
                  </div>
                  <Badge tone={u.role === "owner" ? "teal" : "neutral"}>{roleLabel(u.role)}</Badge>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Providers" description="Weekly availability, clipped to business hours." />
            <ul className="divide-y divide-ink-100">
              {providers.map((p) => (
                <li key={p.id} className="px-5 py-4">
                  <p className="font-bold text-ink-900">
                    {p.name} <span className="font-normal text-ink-500">· {p.title}</span>
                  </p>
                  <div className="mt-3 grid grid-cols-7 gap-1.5 text-center text-[11px]">
                    {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                      const wins = p.availability.filter((a) => a.dayOfWeek === d);
                      return (
                        <div key={d} className={wins.length ? "rounded bg-clinic-50 py-1.5 text-clinic-900" : "bg-closed rounded py-1.5 text-ink-300"}>
                          <p className="font-bold">{DAYS[d]}</p>
                          {wins.length ? (
                            wins.map((w) => (
                              <p key={w.start} className="tabular-nums">
                                {format12h(w.start).replace(":00", "").replace(" ", "")}–{format12h(w.end).replace(":00", "").replace(" ", "")}
                              </p>
                            ))
                          ) : (
                            <p>Off</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {canInvite && (
          <Card className="xl:self-start">
            <CardHeader title="Invite staff" />
            <CardBody>
              <InviteStaffForm
                tenantId={tenant.id}
                disabledReason={full ? "No seats left; the server will reject this invite until you upgrade." : undefined}
              />
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
