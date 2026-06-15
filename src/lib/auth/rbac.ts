import { AppointmentError } from "@/lib/errors";
import type { Actor, User, UserRole } from "@/types";

export type Permission =
  | "appointment:create"
  | "appointment:read"
  | "appointment:manage"
  | "appointment:cancel_own"
  | "customer:read"
  | "customer:write"
  | "waitlist:join"
  | "waitlist:read"
  | "waitlist:manage"
  | "service:read"
  | "service:write"
  | "staff:read"
  | "staff:invite"
  | "settings:read"
  | "settings:write"
  | "billing:read"
  | "billing:manage"
  | "audit:read"
  | "admin:read";

const ALL_TENANT: UserRole[] = ["owner", "staff", "client", "platform_admin"];
const STAFF_UP: UserRole[] = ["owner", "staff", "platform_admin"];
const OWNER_UP: UserRole[] = ["owner", "platform_admin"];

/** Single source of truth for who may do what. Every API route and service goes through `authorize`. */
export const GRANTS: Record<Permission, UserRole[]> = {
  "appointment:create": ALL_TENANT,
  "appointment:read": ALL_TENANT, // clients are further scoped to their own rows by the service
  "appointment:manage": STAFF_UP,
  "appointment:cancel_own": ALL_TENANT,
  "customer:read": STAFF_UP,
  "customer:write": STAFF_UP,
  "waitlist:join": ALL_TENANT,
  "waitlist:read": STAFF_UP,
  "waitlist:manage": STAFF_UP,
  "service:read": ALL_TENANT,
  "service:write": OWNER_UP,
  "staff:read": STAFF_UP,
  "staff:invite": OWNER_UP,
  "settings:read": STAFF_UP,
  "settings:write": OWNER_UP,
  "billing:read": OWNER_UP,
  "billing:manage": OWNER_UP,
  "audit:read": STAFF_UP,
  "admin:read": ["platform_admin"],
};

export function can(actor: Actor | null, permission: Permission): boolean {
  return !!actor && GRANTS[permission].includes(actor.role);
}

/**
 * Asserts the actor is signed in, belongs to `tenantId` (platform admins may cross tenants),
 * and holds `permission`. Returns the actor for convenience.
 */
export function authorize(
  actor: Actor | null,
  permission: Permission,
  tenantId?: string
): Actor {
  if (!actor) {
    throw new AppointmentError("UNAUTHORIZED", "Sign in to continue.");
  }
  if (tenantId && actor.role !== "platform_admin" && actor.tenantId !== tenantId) {
    throw new AppointmentError("TENANT_MISMATCH", "You do not have access to this organization.");
  }
  if (!GRANTS[permission].includes(actor.role)) {
    throw new AppointmentError("FORBIDDEN", "Your role does not permit this action.", {
      permission,
      role: actor.role,
    });
  }
  return actor;
}

export function actorFromUser(user: User): Actor {
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
  };
}

export function roleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    platform_admin: "Platform admin",
    owner: "Owner",
    staff: "Staff",
    client: "Client",
  };
  return labels[role];
}
