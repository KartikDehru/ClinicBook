import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import {
  computePlatformMetrics,
  getTenantRevenueBreakdown,
  listRecentInvoices,
} from "@/lib/admin/metrics";
import { listAllTenants } from "@/lib/tenants/resolve-tenant";
import { store } from "@/lib/store";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function AdminDashboardPage() {
  const metrics = computePlatformMetrics();
  const revenue = getTenantRevenueBreakdown();
  const invoices = listRecentInvoices();
  const tenants = listAllTenants();

  return (
    <>
      <SiteHeader />
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-12">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Platform admin</h1>
          <p className="text-slate-600">Revenue, bookings, and tenant overview.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total tenants" value={metrics.totalTenants} />
          <StatCard title="Active subscriptions" value={metrics.activeSubscriptions} />
          <StatCard title="MRR" value={`$${metrics.mrr}`} />
          <StatCard
            title="Bookings (month)"
            value={metrics.bookingsThisMonth}
            description={`Cancellation rate ${metrics.cancellationRate}%`}
          />
        </div>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Tenants</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Organization</th>
                  <th className="px-4 py-3 font-medium">Vertical</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">MRR</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => {
                  const row = revenue.find((r) => r.tenantId === t.id);
                  return (
                    <tr key={t.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium">{t.name}</td>
                      <td className="px-4 py-3 capitalize">{t.vertical}</td>
                      <td className="px-4 py-3">
                        <Badge className="uppercase">{t.plan}</Badge>
                      </td>
                      <td className="px-4 py-3">${row?.mrr ?? 0}</td>
                      <td className="px-4 py-3">
                        <Link href={`/t/${t.slug}`} className="text-brand-600 hover:underline">
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Recent bookings (all tenants)</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Tenant</th>
                </tr>
              </thead>
              <tbody>
                {store.appointments.map((a) => {
                  const tenant = tenants.find((t) => t.id === a.tenantId);
                  return (
                    <tr key={a.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">{a.serviceName}</td>
                      <td className="px-4 py-3">
                        {format(new Date(a.startsAt), "MMM d, h:mm a")}
                      </td>
                      <td className="px-4 py-3 capitalize">{a.status}</td>
                      <td className="px-4 py-3">{tenant?.name}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Invoices</h2>
          <ul className="space-y-2 text-sm text-slate-600">
            {invoices.map((inv) => (
              <li key={inv.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                {inv.id} — ${inv.amount / 100} {inv.status}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}