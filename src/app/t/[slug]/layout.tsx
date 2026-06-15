import { TenantShell } from "@/components/layout/tenant-shell";
import { can } from "@/lib/auth/rbac";
import { getActor } from "@/lib/auth/session";
import { getContainer } from "@/lib/container";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = getContainer();
  const tenant = await c.repos.tenants.getBySlug(slug);
  if (!tenant) notFound();
  const actor = await getActor();
  const visible = actor && (actor.role === "platform_admin" || actor.tenantId === tenant.id) ? actor : null;

  const waitingCount = can(visible, "waitlist:read")
    ? (await c.repos.waitlist.listByTenant(tenant.id)).filter((w) => w.status === "waiting" || w.status === "offered").length
    : 0;

  return (
    <TenantShell tenant={tenant} actor={visible} waitingCount={waitingCount}>
      {children}
    </TenantShell>
  );
}
