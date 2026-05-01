import type { User, UserRole } from "@/types";

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  platform_admin: 100,
  owner: 80,
  staff: 50,
  client: 10,
};

export function hasMinimumRole(user: User, required: UserRole): boolean {
  return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[required];
}

export function canManageBookings(user: User): boolean {
  return hasMinimumRole(user, "staff");
}

export function canManageBilling(user: User): boolean {
  return hasMinimumRole(user, "owner");
}

export function canViewAdminDashboard(user: User): boolean {
  return user.role === "platform_admin" || user.role === "owner";
}

export function roleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    platform_admin: "Platform Admin",
    owner: "Owner",
    staff: "Staff",
    client: "Client",
  };
  return labels[role];
}