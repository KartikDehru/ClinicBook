import { headers } from "next/headers";
import { store } from "@/lib/store";
import type { Tenant } from "@/types";

export function getTenantBySlug(slug: string): Tenant | undefined {
  return store.tenants.find((t) => t.slug === slug || t.subdomain === slug);
}

export function getTenantById(id: string): Tenant | undefined {
  return store.tenants.find((t) => t.id === id);
}

/**
 * Mock subdomain resolution: {subdomain}.localhost or path /t/[slug]
 */
export async function resolveTenantFromRequest(
  slugFromPath?: string
): Promise<Tenant | null> {
  if (slugFromPath) {
    return getTenantBySlug(slugFromPath) ?? null;
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const subdomain = host.split(".")[0];

  if (subdomain && subdomain !== "localhost" && subdomain !== "www") {
    const bySub = store.tenants.find((t) => t.subdomain === subdomain);
    if (bySub) return bySub;
  }

  const mockHeader = h.get("x-tenant-slug");
  if (mockHeader) {
    return getTenantBySlug(mockHeader) ?? null;
  }

  return null;
}

export function listAllTenants(): Tenant[] {
  return [...store.tenants];
}