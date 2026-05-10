import { notFound } from "next/navigation";
import { TenantShell } from "@/components/layout/tenant-shell";
import { resolveTenantFromRequest } from "@/lib/tenants/resolve-tenant";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await resolveTenantFromRequest(slug);
  if (!tenant) notFound();

  return <TenantShell tenant={tenant}>{children}</TenantShell>;
}