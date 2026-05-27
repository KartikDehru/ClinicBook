import Link from "next/link";
import type { Tenant } from "@/types";
import { Badge } from "@/components/ui/badge";

interface TenantShellProps {
  tenant: Tenant;
  children: React.ReactNode;
}

const nav = [
  { href: "", label: "Overview" },
  { href: "/book", label: "Book" },
  { href: "/appointments", label: "Appointments" },
  { href: "/customers", label: "Customers" },
  { href: "/staff", label: "Staff" },
  { href: "/billing", label: "Billing" },
];

export function TenantShell({ tenant, children }: TenantShellProps) {
  const base = `/t/${tenant.slug}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <TenantAccent color={tenant.accentColor} />
            <h1 className="text-2xl font-bold text-slate-900">{tenant.name}</h1>
            <p className="text-sm text-slate-500">
              {tenant.subdomain}.clinicbook.app · {tenant.timezone}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="muted" className="capitalize">
              {tenant.vertical}
            </Badge>
            <Badge className="uppercase">{tenant.plan}</Badge>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={`${base}${item.href}`}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

function TenantAccent({ color }: { color: string }) {
  return (
    <span
      className="mb-2 inline-block h-1 w-12 rounded-full"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}