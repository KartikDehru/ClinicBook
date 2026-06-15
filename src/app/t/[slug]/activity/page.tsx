import { AccessGate } from "@/components/layout/access-gate";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { loadTenantPage } from "@/lib/auth/page-guard";
import { roleLabel } from "@/lib/auth/rbac";
import { getContainer } from "@/lib/container";
import { PLANS } from "@/lib/plans";
import { formatInZone } from "@/lib/time";
import { cn } from "@/lib/utils";
import Link from "next/link";

const TYPES = ["all", "appointment", "waitlist", "service", "user", "tenant", "billing"] as const;

export default async function ActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { slug } = await params;
  const { type } = await searchParams;
  const ctx = await loadTenantPage(slug, "audit:read");
  if (!ctx.ok) return <AccessGate ctx={ctx} path={`/t/${slug}/activity`} />;
  const { tenant, actor } = ctx;
  const entries = await getContainer().audit.list(actor, tenant.id, { limit: 200 });
  const shown = entries.filter((e) => !type || type === "all" || e.entityType === type);
  const days = PLANS[tenant.plan].limits.auditLogDays;

  return (
    <>
      <PageHeader title="Activity" description={`Who changed what. Retained for ${days} days on the ${PLANS[tenant.plan].name} plan.`} />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {TYPES.map((t) => {
          const active = (type ?? "all") === t;
          return (
            <Link
              key={t}
              href={`/t/${slug}/activity?type=${t}`}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-semibold capitalize",
                active ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
              )}
            >
              {t}
            </Link>
          );
        })}
      </div>
      <Card>
        {shown.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No activity" body="Changes to appointments, services and settings will appear here." />
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {shown.map((e) => (
              <li key={e.id} className="grid gap-1 px-5 py-3.5 sm:grid-cols-[170px_1fr_auto] sm:items-baseline sm:gap-6">
                <span className="text-xs tabular-nums text-ink-400">{formatInZone(new Date(e.at), tenant.timezone, "dayTime")}</span>
                <span>
                  <span className="block text-sm text-ink-900">{e.summary}</span>
                  <span className="font-mono text-[11px] text-ink-400">{e.action}</span>
                </span>
                <span className="flex items-center gap-2 text-xs text-ink-500">
                  {e.actorName} <Badge>{roleLabel(e.actorRole)}</Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
