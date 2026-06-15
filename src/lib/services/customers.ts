import { AppointmentError } from "@/lib/errors";
import { authorize } from "@/lib/auth/rbac";
import { newId } from "@/lib/utils";
import type { Actor, Customer } from "@/types";
import type { AuditService } from "@/lib/services/audit";
import type { Deps } from "@/lib/services/deps";

export interface CreateCustomerInput {
  tenantId: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
}

export class CustomerService {
  constructor(
    private d: Deps,
    private audit: AuditService
  ) {}

  async list(actor: Actor | null, tenantId: string): Promise<Customer[]> {
    authorize(actor, "customer:read", tenantId);
    return this.d.repos.customers.listByTenant(tenantId);
  }

  async create(actor: Actor | null, input: CreateCustomerInput): Promise<Customer> {
    authorize(actor, "customer:write", input.tenantId);
    const existing = await this.d.repos.customers.getByEmail(input.tenantId, input.email);
    if (existing) {
      throw new AppointmentError("CONFLICT", "A customer with this email already exists.", {
        customerId: existing.id,
      });
    }
    const customer = await this.d.repos.customers.insert({
      id: newId("cus"),
      tenantId: input.tenantId,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      createdAt: this.d.now().toISOString(),
    });
    await this.audit.record(actor!, {
      tenantId: input.tenantId,
      action: "customer.created",
      entityType: "customer",
      entityId: customer.id,
      summary: `Added customer ${customer.name}`,
    });
    return customer;
  }
}
