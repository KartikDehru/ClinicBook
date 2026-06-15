import Link from "next/link";
import { AccessGate } from "@/components/layout/access-gate";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { CreateCustomerForm } from "@/components/tenant/forms";
import { loadTenantPage } from "@/lib/auth/page-guard";
import { getContainer } from "@/lib/container";
import { formatInZone } from "@/lib/time";

export default async function CustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { slug } = await params;
  const { q } = await searchParams;
  const ctx = await loadTenantPage(slug, "customer:read");
  if (!ctx.ok) return <AccessGate ctx={ctx} path={`/t/${slug}/customers`} />;
  const { tenant, actor } = ctx;
  const c = getContainer();

  const [customers, appointments] = await Promise.all([
    c.customers.list(actor, tenant.id),
    c.repos.appointments.list({ tenantId: tenant.id }),
  ]);
  const needle = q?.trim().toLowerCase();
  const rows = customers
    .filter((x) => !needle || x.name.toLowerCase().includes(needle) || x.email.toLowerCase().includes(needle))
    .map((x) => {
      const mine = appointments.filter((a) => a.customerId === x.id && a.status !== "cancelled");
      const last = [...mine].reverse().find((a) => Date.parse(a.startsAt) < Date.now());
      return { ...x, visits: mine.filter((a) => a.status === "completed").length, last };
    });

  return (
    <>
      <PageHeader title="Customers" description={`${customers.length} on file`} />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader
            title="Directory"
            action={
              <form className="flex gap-2" action={`/t/${slug}/customers`}>
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Search name or email"
                  className="w-56 rounded-md border border-ink-200 px-3 py-1.5 text-sm"
                />
              </form>
            }
          />
          {rows.length === 0 ? (
            <CardBody>
              <EmptyState title={needle ? "No matches" : "No customers yet"} body="Add one with the form, or they appear when they first book." />
            </CardBody>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-left text-xs font-bold uppercase tracking-wide text-ink-400">
                    <th className="px-5 py-2.5">Name</th>
                    <th className="px-5 py-2.5">Contact</th>
                    <th className="px-5 py-2.5">Visits</th>
                    <th className="px-5 py-2.5">Last visit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-5 py-3">
                        <span className="block font-bold text-ink-900">{r.name}</span>
                        {r.notes && <span className="text-xs text-ink-500">{r.notes}</span>}
                      </td>
                      <td className="px-5 py-3 text-ink-700">
                        {r.email}
                        {r.phone && <span className="block text-xs text-ink-400">{r.phone}</span>}
                      </td>
                      <td className="px-5 py-3 tabular-nums text-ink-700">{r.visits}</td>
                      <td className="px-5 py-3 text-ink-500">
                        {r.last ? (
                          <Link
                            href={`/t/${slug}/appointments?selected=${r.last.id}&week=${r.last.startsAt.slice(0, 10)}`}
                            className="hover:text-clinic-700"
                          >
                            {formatInZone(new Date(r.last.startsAt), tenant.timezone, "date")}
                          </Link>
                        ) : (
                          "None"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card className="xl:self-start">
          <CardHeader title="Add customer" />
          <CardBody>
            <CreateCustomerForm tenantId={tenant.id} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
