import { AppointmentError } from "@/lib/errors";
import { authorize } from "@/lib/auth/rbac";
import { PLANS } from "@/lib/plans";
import { verifyStripeWebhook, type StripeGateway, type VerifiedEvent } from "@/lib/stripe/client";
import type { Actor, PlanTier, SubscriptionStatus, Tenant } from "@/types";
import type { AuditService } from "@/lib/services/audit";
import type { Deps } from "@/lib/services/deps";
import type { Notifier } from "@/lib/services/notifier";

export interface BillingConfig {
  priceIds: Record<"pro" | "enterprise", string>;
  webhookSecret?: string;
  mock: boolean;
}

export interface WebhookResult {
  handled: boolean;
  duplicate?: boolean;
  message: string;
}

const PAID: PlanTier[] = ["pro", "enterprise"];
const isPaid = (v: unknown): v is "pro" | "enterprise" => PAID.includes(v as PlanTier);

export class BillingService {
  constructor(
    private d: Deps,
    private audit: AuditService,
    private notifier: Notifier,
    private gateway: StripeGateway,
    private config: BillingConfig
  ) {}

  async createCheckout(
    actor: Actor | null,
    tenantId: string,
    plan: "pro" | "enterprise"
  ): Promise<{ sessionId: string; url: string | null }> {
    authorize(actor, "billing:manage", tenantId);
    const tenant = await this.d.repos.tenants.get(tenantId);
    if (!tenant) throw new AppointmentError("NOT_FOUND", "Organization not found.");
    if (!isPaid(plan)) throw new AppointmentError("VALIDATION_FAILED", "Choose a paid plan.");
    if (tenant.plan === plan && tenant.subscriptionStatus === "active") {
      throw new AppointmentError("CONFLICT", `Already subscribed to ${PLANS[plan].name}.`);
    }

    const session = await this.gateway.createCheckoutSession({
      tenantId,
      tenantSlug: tenant.slug,
      plan,
      priceId: this.config.priceIds[plan],
      customerId: tenant.stripeCustomerId,
      customerEmail: `billing+${tenant.slug}@clinicbook.app`,
      successUrl: `${this.d.appUrl}/billing/success?tenant=${tenant.slug}&plan=${plan}`,
      cancelUrl: `${this.d.appUrl}/t/${tenant.slug}/billing`,
    });

    // The mock gateway has no Stripe to call back, so complete the session in-process.
    if (session.mock) {
      await this.processEvent({
        id: `evt_${session.id}`,
        type: "checkout.session.completed",
        data: {
          object: {
            id: session.id,
            customer: tenant.stripeCustomerId ?? `cus_mock_${tenant.slug}`,
            subscription: `sub_mock_${tenant.slug}_${plan}`,
            metadata: { tenantId, plan },
          },
        },
      });
    }

    await this.audit.record(actor!, {
      tenantId,
      action: "billing.checkout_started",
      entityType: "billing",
      entityId: session.id,
      summary: `Started checkout for ${PLANS[plan].name}`,
    });
    return { sessionId: session.id, url: session.url };
  }

  /** Entry point for the HTTP webhook route. */
  async handleWebhook(rawBody: string, signature: string | null): Promise<WebhookResult> {
    const event = verifyStripeWebhook(rawBody, signature, {
      secret: this.config.webhookSecret,
      mock: this.config.mock,
    });
    return this.processEvent(event);
  }

  async processEvent(event: VerifiedEvent): Promise<WebhookResult> {
    if (await this.d.repos.webhookEvents.has(event.id)) {
      return { handled: true, duplicate: true, message: "Event already processed" };
    }
    const obj = event.data.object;
    const meta = (obj.metadata ?? {}) as Record<string, string | undefined>;
    let result: WebhookResult;

    switch (event.type) {
      case "checkout.session.completed": {
        const tenant = await this.tenantFor(meta.tenantId, obj.customer);
        if (!tenant || !isPaid(meta.plan)) {
          result = { handled: false, message: "Checkout event missing tenant or plan metadata" };
          break;
        }
        const updated = await this.applyPlan(tenant, meta.plan, {
          customerId: asString(obj.customer),
          subscriptionId: asString(obj.subscription),
          status: "active",
        });
        const owner = (await this.d.repos.users.listByTenant(tenant.id)).find((u) => u.role === "owner");
        if (owner) void this.notifier.billingReceipt(updated, owner.email);
        result = { handled: true, message: `Tenant upgraded to ${meta.plan}` };
        break;
      }
      case "customer.subscription.updated": {
        const tenant = await this.tenantFor(meta.tenantId, obj.customer);
        if (!tenant) {
          result = { handled: false, message: "Unknown tenant" };
          break;
        }
        const status = mapStripeStatus(asString(obj.status));
        const plan = isPaid(meta.plan) ? meta.plan : tenant.plan;
        await this.applyPlan(tenant, plan, { subscriptionId: asString(obj.id), status });
        result = { handled: true, message: "Subscription updated" };
        break;
      }
      case "customer.subscription.deleted": {
        const tenant = await this.tenantFor(meta.tenantId, obj.customer);
        if (!tenant) {
          result = { handled: false, message: "Unknown tenant" };
          break;
        }
        await this.cancelTenant(tenant);
        result = { handled: true, message: "Subscription canceled; tenant downgraded" };
        break;
      }
      case "invoice.payment_failed": {
        const tenant = await this.tenantFor(undefined, obj.customer);
        if (!tenant) {
          result = { handled: false, message: "Unknown customer" };
          break;
        }
        await this.d.repos.tenants.update(tenant.id, { subscriptionStatus: "past_due" });
        result = { handled: true, message: "Marked past_due" };
        break;
      }
      default:
        result = { handled: false, message: `Ignored event type ${event.type}` };
    }

    await this.d.repos.webhookEvents.add(event.id);
    this.d.log.info("stripe event processed", { eventId: event.id, type: event.type, handled: result.handled });
    return result;
  }

  private async tenantFor(tenantId: string | undefined, customer: unknown): Promise<Tenant | undefined> {
    if (tenantId) return this.d.repos.tenants.get(tenantId);
    const customerId = asString(customer);
    if (!customerId) return undefined;
    return (await this.d.repos.tenants.list()).find((t) => t.stripeCustomerId === customerId);
  }

  private async applyPlan(
    tenant: Tenant,
    plan: PlanTier,
    opts: { customerId?: string; subscriptionId?: string; status: SubscriptionStatus }
  ): Promise<Tenant> {
    const updated = await this.d.repos.tenants.update(tenant.id, {
      plan,
      subscriptionStatus: opts.status,
      stripeCustomerId: opts.customerId ?? tenant.stripeCustomerId,
      stripeSubscriptionId: opts.subscriptionId ?? tenant.stripeSubscriptionId,
      canceledAt: undefined,
      churnedFromPlan: undefined,
    });
    await this.systemAudit(tenant.id, "billing.plan_changed", `Plan changed ${tenant.plan} → ${plan}`, {
      before: { plan: tenant.plan },
      after: { plan, status: opts.status },
    });
    return updated;
  }

  private async cancelTenant(tenant: Tenant): Promise<void> {
    await this.d.repos.tenants.update(tenant.id, {
      plan: "free",
      subscriptionStatus: "canceled",
      stripeSubscriptionId: undefined,
      canceledAt: this.d.now().toISOString(),
      churnedFromPlan: tenant.plan === "free" ? tenant.churnedFromPlan : tenant.plan,
    });
    await this.systemAudit(tenant.id, "billing.subscription_canceled", `Subscription canceled (was ${tenant.plan})`, {
      before: { plan: tenant.plan },
      after: { plan: "free" },
    });
  }

  private async systemAudit(
    tenantId: string,
    action: string,
    summary: string,
    extra: { before?: Record<string, unknown>; after?: Record<string, unknown> }
  ) {
    await this.audit.record(
      { userId: "system:stripe", name: "Stripe", email: "stripe@system", role: "platform_admin", tenantId: null },
      { tenantId, action, entityType: "billing", entityId: tenantId, summary, ...extra }
    );
  }
}

function asString(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "id" in v && typeof (v as { id: unknown }).id === "string") {
    return (v as { id: string }).id;
  }
  return undefined;
}

function mapStripeStatus(status: string | undefined): SubscriptionStatus {
  switch (status) {
    case "trialing":
      return "trialing";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "active";
  }
}
