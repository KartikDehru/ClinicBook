import { env } from "@/lib/env";
import { OutboxMailer, type Mailer } from "@/lib/email/mailer";
import { IdempotencyGuard } from "@/lib/idempotency";
import { logger, type Logger } from "@/lib/logging";
import { createMemoryRepositories } from "@/lib/repos/memory";
import type { Repositories } from "@/lib/repos/types";
import { buildSeed } from "@/lib/seed";
import { AppointmentService } from "@/lib/services/appointments";
import { AuditService } from "@/lib/services/audit";
import { BillingService, type BillingConfig } from "@/lib/services/billing";
import { CustomerService } from "@/lib/services/customers";
import type { Deps } from "@/lib/services/deps";
import { MetricsService } from "@/lib/services/metrics";
import { Notifier } from "@/lib/services/notifier";
import { TenantAdminService } from "@/lib/services/tenant-admin";
import { WaitlistService } from "@/lib/services/waitlist";
import { createStripeGateway, type StripeGateway } from "@/lib/stripe/client";

export interface Container {
  repos: Repositories;
  mailer: Mailer;
  deps: Deps;
  audit: AuditService;
  notifier: Notifier;
  appointments: AppointmentService;
  waitlist: WaitlistService;
  customers: CustomerService;
  tenantAdmin: TenantAdminService;
  billing: BillingService;
  metrics: MetricsService;
}

export interface ContainerOptions {
  repos?: Repositories;
  mailer?: Mailer;
  now?: () => Date;
  log?: Logger;
  gateway?: StripeGateway;
  billing?: Partial<BillingConfig>;
  appUrl?: string;
}

/** Composition root. Tests build isolated containers; the app uses the `getContainer()` singleton. */
export function createContainer(options: ContainerOptions = {}): Container {
  const now = options.now ?? (() => new Date());
  const repos = options.repos ?? createMemoryRepositories(buildSeed(now()));
  const mailer = options.mailer ?? new OutboxMailer();
  const deps: Deps = {
    repos,
    mailer,
    log: options.log ?? logger,
    now,
    idempotency: new IdempotencyGuard(repos.idempotency, () => now().getTime()),
    appUrl: options.appUrl ?? env.NEXT_PUBLIC_APP_URL,
    emailFrom: env.EMAIL_FROM,
  };

  const audit = new AuditService(deps);
  const notifier = new Notifier(deps);
  const waitlist = new WaitlistService(deps, audit, notifier);
  const appointments = new AppointmentService(deps, audit, notifier, waitlist);
  const customers = new CustomerService(deps, audit);
  const tenantAdmin = new TenantAdminService(deps, audit, notifier);
  const billing = new BillingService(deps, audit, notifier, options.gateway ?? createStripeGateway(), {
    priceIds: {
      pro: env.STRIPE_PRICE_PRO,
      enterprise: env.STRIPE_PRICE_ENTERPRISE,
    },
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    mock: env.STRIPE_MOCK,
    ...options.billing,
  });
  const metrics = new MetricsService(deps);

  return { repos, mailer, deps, audit, notifier, appointments, waitlist, customers, tenantAdmin, billing, metrics };
}

const g = globalThis as unknown as { __clinicbookContainer?: Container };

/**
 * Process-wide singleton. Stored on globalThis in every environment because Next.js may
 * instantiate route bundles separately; without this each route would see its own empty store.
 */
export function getContainer(): Container {
  if (!g.__clinicbookContainer) g.__clinicbookContainer = createContainer();
  return g.__clinicbookContainer;
}
