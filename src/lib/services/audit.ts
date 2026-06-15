import { newId } from "@/lib/utils";
import { authorize } from "@/lib/auth/rbac";
import type { Actor, AuditEntry } from "@/types";
import type { Deps } from "@/lib/services/deps";
import { PLANS } from "@/lib/plans";

export type AuditInput = Omit<AuditEntry, "id" | "at" | "actorId" | "actorName" | "actorRole">;

export class AuditService {
  constructor(private d: Deps) {}

  async record(actor: Actor, input: AuditInput): Promise<void> {
    await this.d.repos.audit.append({
      ...input,
      id: newId("aud"),
      at: this.d.now().toISOString(),
      actorId: actor.userId,
      actorName: actor.name,
      actorRole: actor.role,
    });
  }

  /** Staff+ can read; retention window follows the tenant's plan. */
  async list(
    actor: Actor | null,
    tenantId: string,
    opts: { entityId?: string; limit?: number } = {}
  ): Promise<AuditEntry[]> {
    authorize(actor, "audit:read", tenantId);
    const tenant = await this.d.repos.tenants.get(tenantId);
    const days = tenant ? PLANS[tenant.plan].limits.auditLogDays : 7;
    const since = new Date(this.d.now().getTime() - days * 86_400_000).toISOString();
    return this.d.repos.audit.list(tenantId, { ...opts, since });
  }
}
