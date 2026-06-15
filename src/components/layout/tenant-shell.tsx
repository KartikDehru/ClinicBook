import Link from "next/link";
import { can, roleLabel } from "@/lib/auth/rbac";
import { formatInZone, shortZoneName } from "@/lib/time";
import { initials } from "@/lib/utils";
import { PLANS } from "@/lib/plans";
import type { Actor, Tenant } from "@/types";
import { SidebarNav, type NavEntry } from "@/components/layout/sidebar-nav";
import { SignOutButton } from "@/components/auth/sign-out-button";

export function TenantShell({
  tenant,
  actor,
  waitingCount,
  children,
}: {
  tenant: Tenant;
  actor: Actor | null;
  waitingCount: number;
  children: React.ReactNode;
}) {
  const base = `/t/${tenant.slug}`;
  const now = new Date();

  const items: NavEntry[] = [];
  if (can(actor, "appointment:manage")) items.push({ href: "", label: "Today", icon: "today", group: "operate" });
  if (actor) {
    items.push({
      href: "/appointments",
      label: actor.role === "client" ? "My appointments" : "Calendar",
      icon: "calendar",
      group: "operate",
    });
  }
  items.push({ href: "/book", label: "Book", icon: "book", group: "operate" });
  if (can(actor, "waitlist:read")) {
    items.push({ href: "/waitlist", label: "Waitlist", icon: "waitlist", group: "operate", badge: waitingCount || undefined });
  }
  if (can(actor, "customer:read")) items.push({ href: "/customers", label: "Customers", icon: "customers", group: "operate" });
  if (can(actor, "staff:read")) {
    items.push({ href: "/services", label: "Services", icon: "services", group: "manage" });
    items.push({ href: "/team", label: "Team", icon: "team", group: "manage" });
  }
  if (can(actor, "audit:read")) items.push({ href: "/activity", label: "Activity", icon: "activity", group: "manage" });
  if (can(actor, "settings:read")) items.push({ href: "/settings", label: "Settings", icon: "settings", group: "manage" });
  if (can(actor, "billing:read")) items.push({ href: "/billing", label: "Billing", icon: "billing", group: "manage" });

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="bg-clinic-900 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="px-6 pb-4 pt-6">
          <Link href={base} className="block">
            <p className="font-display text-xl font-semibold leading-snug">{tenant.name}</p>
          </Link>
          <p className="mt-1 text-xs text-clinic-200">
            {formatInZone(now, tenant.timezone, "time")} {shortZoneName(now, tenant.timezone)} ·{" "}
            {PLANS[tenant.plan].name}
          </p>
        </div>
        <div className="lg:flex-1 lg:overflow-y-auto lg:pt-2">
          <SidebarNav base={base} items={items} />
        </div>
        <div className="hidden border-t border-white/10 p-4 lg:block">
          {actor ? (
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-clinic-700 text-xs font-bold">
                {initials(actor.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{actor.name}</p>
                <p className="text-xs text-clinic-200">{roleLabel(actor.role)}</p>
              </div>
            </div>
          ) : (
            <Link href={`/demo?next=${encodeURIComponent(base)}`} className="text-sm font-semibold text-white underline">
              Sign in
            </Link>
          )}
          {actor && (
            <SignOutButton className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-clinic-200 hover:text-white" />
          )}
        </div>
      </aside>
      <main className="min-w-0 px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
