import { notFound } from "next/navigation";
import { resolveTenantFromRequest } from "@/lib/tenants/resolve-tenant";
import { getCustomersForTenant } from "@/lib/customers/service";
import { CustomerList } from "@/components/customers/customer-list";
import { CreateCustomerForm } from "@/components/customers/create-customer-form";

export default async function CustomersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await resolveTenantFromRequest(slug);
  if (!tenant) notFound();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Customers</h2>
        <p className="text-slate-600">Patients, members, and students for {tenant.name}.</p>
      </div>
      <CreateCustomerForm tenantId={tenant.id} />
      <CustomerList customers={getCustomersForTenant(tenant.id)} />
    </div>
  );
}