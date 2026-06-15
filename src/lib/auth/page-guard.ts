import { notFound } from "next/navigation";
import { authorize, type Permission } from "@/lib/auth/rbac";
import { getActor } from "@/lib/auth/session";
import { getContainer } from "@/lib/container";
import { isAppointmentError } from "@/lib/errors";
import type { Actor, Tenant } from "@/types";

export type TenantPageContext =
  | { ok: true; tenant: Tenant; actor: Actor }
  | { ok: false; tenant: Tenant; reason: "unauthorized" | "forbidden" };

/** Resolve tenant + actor for a server-rendered tenant page and enforce `permission`. */
export async function loadTenantPage(
  slug: string,
  permission: Permission
): Promise<TenantPageContext> {
  const tenant = await getContainer().repos.tenants.getBySlug(slug);
  if (!tenant) notFound();
  const actor = await getActor();
  try {
    authorize(actor, permission, tenant.id);
    return { ok: true, tenant, actor: actor! };
  } catch (err) {
    if (isAppointmentError(err) && err.code === "UNAUTHORIZED") {
      return { ok: false, tenant, reason: "unauthorized" };
    }
    return { ok: false, tenant, reason: "forbidden" };
  }
}
