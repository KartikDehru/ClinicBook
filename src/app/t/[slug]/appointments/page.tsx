import { notFound } from "next/navigation";
import { resolveTenantFromRequest } from "@/lib/tenants/resolve-tenant";
import { getAppointmentsForTenant } from "@/lib/appointments/service";
import { getProvidersForTenant } from "@/lib/providers/service";
import { getCustomersForTenant } from "@/lib/customers/service";
import { getCurrentUser } from "@/lib/auth/session";
import { canManageBookings } from "@/lib/auth/roles";
import { AppointmentTable } from "@/components/appointments/appointment-table";

export default async function AppointmentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await resolveTenantFromRequest(slug);
  if (!tenant) notFound();

  const user = await getCurrentUser();
  const canManage = user ? canManageBookings(user) && user.tenantId === tenant.id : true;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Appointments</h2>
        <p className="text-slate-600">Upcoming and past visits for this organization.</p>
      </div>
      <AppointmentTable
        appointments={getAppointmentsForTenant(tenant.id)}
        providers={getProvidersForTenant(tenant.id)}
        customers={getCustomersForTenant(tenant.id)}
        canManage={canManage}
        tenantSlug={slug}
      />
    </div>
  );
}