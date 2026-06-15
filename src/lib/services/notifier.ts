import type { Appointment, Tenant, WaitlistEntry } from "@/types";
import type { Deps } from "@/lib/services/deps";
import {
  renderBillingReceipt,
  renderBookingConfirmation,
  renderCancellation,
  renderReschedule,
  renderStaffInvite,
  renderWaitlistJoined,
  renderWaitlistOffer,
  type AppointmentEmailContext,
  type RenderedEmail,
} from "@/lib/email/templates";
import { formatLocalDate } from "@/lib/time";
import { PLANS } from "@/lib/plans";

/** Builds and dispatches transactional email. Failures are logged, never thrown into business flows. */
export class Notifier {
  constructor(private d: Deps) {}

  private async deliver(
    kind: string,
    to: string,
    rendered: RenderedEmail,
    tenantId?: string
  ): Promise<void> {
    try {
      await this.d.mailer.send({ ...rendered, to, from: this.d.emailFrom, kind, tenantId });
    } catch (err) {
      this.d.log.error("email delivery failed", {
        kind,
        to,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private async context(appt: Appointment): Promise<{
    ctx: AppointmentEmailContext;
    email: string;
    tenant: Tenant;
  } | null> {
    const [tenant, provider, customer] = await Promise.all([
      this.d.repos.tenants.get(appt.tenantId),
      this.d.repos.providers.get(appt.providerId),
      this.d.repos.customers.get(appt.customerId),
    ]);
    if (!tenant || !provider || !customer) return null;
    return {
      tenant,
      email: customer.email,
      ctx: {
        tenantName: tenant.name,
        timezone: tenant.timezone,
        customerName: customer.name,
        serviceName: appt.serviceName,
        providerName: provider.name,
        startsAt: appt.startsAt,
        priceCents: appt.priceCents,
        currency: appt.currency,
        confirmationCode: appt.id.toUpperCase(),
        manageUrl: `${this.d.appUrl}/t/${tenant.slug}/appointments`,
        cancellationPolicy: tenant.cancellationPolicy,
        cancelReason: appt.cancelReason,
      },
    };
  }

  async bookingConfirmed(appt: Appointment) {
    const c = await this.context(appt);
    if (c) await this.deliver("booking.confirmed", c.email, renderBookingConfirmation(c.ctx), c.tenant.id);
  }

  async rescheduled(appt: Appointment, previousStartsAt: string) {
    const c = await this.context(appt);
    if (c) {
      await this.deliver(
        "booking.rescheduled",
        c.email,
        renderReschedule({ ...c.ctx, previousStartsAt }),
        c.tenant.id
      );
    }
  }

  async cancelled(appt: Appointment) {
    const c = await this.context(appt);
    if (c) {
      await this.deliver(
        "booking.cancelled",
        c.email,
        renderCancellation({ ...c.ctx, manageUrl: `${this.d.appUrl}/t/${c.tenant.slug}/book` }),
        c.tenant.id
      );
    }
  }

  async waitlistJoined(entry: WaitlistEntry) {
    const [tenant, provider, service, customer] = await Promise.all([
      this.d.repos.tenants.get(entry.tenantId),
      this.d.repos.providers.get(entry.providerId),
      this.d.repos.services.get(entry.serviceId),
      this.d.repos.customers.get(entry.customerId),
    ]);
    if (!tenant || !provider || !service || !customer) return;
    await this.deliver(
      "waitlist.joined",
      customer.email,
      renderWaitlistJoined({
        tenantName: tenant.name,
        customerName: customer.name,
        serviceName: service.name,
        providerName: provider.name,
        desiredDateLabel: formatLocalDate(entry.desiredDate, {
          weekday: "long",
          month: "long",
          day: "numeric",
        }),
      }),
      tenant.id
    );
  }

  async waitlistOffer(entry: WaitlistEntry, freed: Appointment) {
    const c = await this.context(freed);
    if (!c) return;
    const customer = await this.d.repos.customers.get(entry.customerId);
    if (!customer) return;
    await this.deliver(
      "waitlist.offer",
      customer.email,
      renderWaitlistOffer({
        ...c.ctx,
        customerName: customer.name,
        bookUrl: `${this.d.appUrl}/t/${c.tenant.slug}/book`,
      }),
      c.tenant.id
    );
  }

  async staffInvite(tenant: Tenant, inviteeName: string, inviteeEmail: string, inviterName: string) {
    await this.deliver(
      "staff.invite",
      inviteeEmail,
      renderStaffInvite({
        tenantName: tenant.name,
        inviteeName,
        inviterName,
        loginUrl: `${this.d.appUrl}/t/${tenant.slug}`,
      }),
      tenant.id
    );
  }

  async billingReceipt(tenant: Tenant, ownerEmail: string) {
    const plan = PLANS[tenant.plan];
    await this.deliver(
      "billing.receipt",
      ownerEmail,
      renderBillingReceipt({
        tenantName: tenant.name,
        planName: plan.name,
        amountCents: plan.priceMonthly * 100,
        billingUrl: `${this.d.appUrl}/t/${tenant.slug}/billing`,
      }),
      tenant.id
    );
  }
}
