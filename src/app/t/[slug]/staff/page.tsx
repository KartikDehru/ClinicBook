import { notFound } from "next/navigation";
import { resolveTenantFromRequest } from "@/lib/tenants/resolve-tenant";
import { getProvidersForTenant } from "@/lib/providers/service";
import { getSeatUsage, getSeatLimit } from "@/lib/tenants/seat-limits";
import { AvailabilityCalendar } from "@/components/staff/availability-calendar";
import { Badge } from "@/components/ui/badge";

export default async function StaffPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await resolveTenantFromRequest(slug);
  if (!tenant) notFound();

  const providers = getProvidersForTenant(tenant.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Staff & availability</h2>
          <p className="text-slate-600">Weekly hours per provider.</p>
        </div>
        <Badge>
          Seats {getSeatUsage(tenant.id)} / {getSeatLimit(tenant.plan)}
        </Badge>
      </div>
      <AvailabilityCalendar providers={providers} />
    </div>
  );
}