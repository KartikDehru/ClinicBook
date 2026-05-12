import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveTenantFromRequest } from "@/lib/tenants/resolve-tenant";
import { getAppointmentsForTenant } from "@/lib/appointments/service";
import { getProvidersForTenant } from "@/lib/providers/service";
import { getSeatUsage, getSeatLimit } from "@/lib/tenants/seat-limits";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function TenantDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await resolveTenantFromRequest(slug);
  if (!tenant) notFound();

  const appointments = getAppointmentsForTenant(tenant.id);
  const providers = getProvidersForTenant(tenant.id);
  const upcoming = appointments.filter((a) => a.status !== "cancelled").length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-slate-600">Today&apos;s snapshot for {tenant.name}</p>
        </div>
        <Button asChild>
          <Link href={`/t/${slug}/book`}>New booking</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Upcoming bookings" value={upcoming} />
        <StatCard title="Staff / providers" value={providers.length} />
        <StatCard
          title="Seats used"
          value={`${getSeatUsage(tenant.id)} / ${getSeatLimit(tenant.plan)}`}
        />
        <StatCard title="Plan" value={tenant.plan.toUpperCase()} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick links</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href={`/t/${slug}/appointments`}>Manage appointments</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/t/${slug}/customers`}>Customers</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/t/${slug}/staff`}>Staff availability</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/t/${slug}/billing`}>Billing</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}