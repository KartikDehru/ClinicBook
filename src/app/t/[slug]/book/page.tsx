import { AccessGate } from "@/components/layout/access-gate";
import { BookingFlow } from "@/components/booking/booking-flow";
import { PageHeader, EmptyState } from "@/components/ui/page";
import { can } from "@/lib/auth/rbac";
import { loadTenantPage } from "@/lib/auth/page-guard";
import { getContainer } from "@/lib/container";
import { PLANS } from "@/lib/plans";

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await loadTenantPage(slug, "appointment:create");
  if (!ctx.ok) return <AccessGate ctx={ctx} path={`/t/${slug}/book`} />;
  const { tenant, actor } = ctx;
  const c = getContainer();

  const [services, providers, customers] = await Promise.all([
    c.repos.services.listByTenant(tenant.id, { activeOnly: true }),
    c.repos.providers.listByTenant(tenant.id),
    can(actor, "customer:read") ? c.repos.customers.listByTenant(tenant.id) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader
        title={actor.role === "client" ? "Book a visit" : "New booking"}
        description={`${tenant.name} · times shown in ${tenant.timezone.replace("_", " ")}`}
      />
      {services.length === 0 ? (
        <EmptyState title="No bookable services" body="An owner needs to add a service before bookings can be made." />
      ) : (
        <BookingFlow
          tenant={{
            id: tenant.id,
            slug: tenant.slug,
            name: tenant.name,
            timezone: tenant.timezone,
            cancellationPolicy: tenant.cancellationPolicy,
            waitlistEnabled: PLANS[tenant.plan].limits.waitlist,
          }}
          services={services}
          providers={providers}
          customers={customers}
          role={actor.role}
          actorName={actor.name}
        />
      )}
    </>
  );
}
