import { AccessGate } from "@/components/layout/access-gate";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { CreateServiceForm, ServiceToggle } from "@/components/tenant/forms";
import { can } from "@/lib/auth/rbac";
import { loadTenantPage } from "@/lib/auth/page-guard";
import { getContainer } from "@/lib/container";
import { formatMoney } from "@/lib/utils";

export default async function ServicesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await loadTenantPage(slug, "staff:read");
  if (!ctx.ok) return <AccessGate ctx={ctx} path={`/t/${slug}/services`} />;
  const { tenant, actor } = ctx;
  const c = getContainer();
  const [services, providers] = await Promise.all([
    c.tenantAdmin.listServices(actor, tenant.id),
    c.repos.providers.listByTenant(tenant.id),
  ]);
  const canEdit = can(actor, "service:write");
  const providerName = new Map(providers.map((p) => [p.id, p.name]));

  return (
    <>
      <PageHeader title="Services" description="What can be booked, for how long, and at what price." />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs font-bold uppercase tracking-wide text-ink-400">
                  <th className="px-5 py-2.5">Service</th>
                  <th className="px-5 py-2.5">Duration</th>
                  <th className="px-5 py-2.5">Price</th>
                  <th className="px-5 py-2.5">Offered by</th>
                  <th className="px-5 py-2.5">Status</th>
                  {canEdit && <th className="px-5 py-2.5" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {services.map((s) => (
                  <tr key={s.id} className={s.active ? "" : "opacity-55"}>
                    <td className="px-5 py-3">
                      <span className="block font-bold text-ink-900">{s.name}</span>
                      <span className="text-xs text-ink-500">{s.description}</span>
                    </td>
                    <td className="px-5 py-3 tabular-nums text-ink-700">{s.durationMinutes} min</td>
                    <td className="px-5 py-3 font-semibold tabular-nums text-ink-900">{formatMoney(s.priceCents, s.currency)}</td>
                    <td className="px-5 py-3 text-ink-700">
                      {s.providerIds.length === 0 ? "Everyone" : s.providerIds.map((id) => providerName.get(id)).join(", ")}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={s.active ? "teal" : "neutral"}>{s.active ? "Bookable" : "Archived"}</Badge>
                    </td>
                    {canEdit && (
                      <td className="px-5 py-3 text-right">
                        <ServiceToggle serviceId={s.id} active={s.active} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        {canEdit && (
          <Card className="xl:self-start">
            <CardHeader title="Add service" />
            <CardBody>
              <CreateServiceForm tenantId={tenant.id} providers={providers.map((p) => ({ id: p.id, name: p.name }))} />
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
