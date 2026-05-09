import { notFound } from "next/navigation";
import { resolveTenantFromRequest } from "@/lib/tenants/resolve-tenant";
import { getProvidersForTenant } from "@/lib/providers/service";
import { getCustomersForTenant } from "@/lib/customers/service";
import { generateOpenSlots } from "@/lib/availability/slots";
import { BookingForm } from "@/components/booking/booking-form";

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await resolveTenantFromRequest(slug);
  if (!tenant) notFound();

  const providers = getProvidersForTenant(tenant.id);
  const customers = getCustomersForTenant(tenant.id);
  const slotsByProvider: Record<string, ReturnType<typeof generateOpenSlots>> = {};

  for (const provider of providers) {
    slotsByProvider[provider.id] = generateOpenSlots(provider.id, new Date(), 14);
  }

  const defaultService =
    tenant.vertical === "clinic"
      ? "Office visit"
      : tenant.vertical === "gym"
        ? "Training session"
        : "Tutoring session";

  return (
    <div className="space-y-6">
      <PageHeader title="Book an appointment" subtitle="Select a provider and open time slot." />
      <BookingForm
        tenantId={tenant.id}
        providers={providers}
        customers={customers}
        slotsByProvider={slotsByProvider}
        defaultServiceName={defaultService}
      />
    </div>
  );
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      <p className="text-slate-600">{subtitle}</p>
    </div>
  );
}