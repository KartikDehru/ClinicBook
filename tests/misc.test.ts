import { describe, expect, it } from "vitest";
import { layoutDayEvents } from "@/lib/calendar-layout";
import { parseEnv } from "@/lib/env";
import { renderBookingConfirmation, escapeHtml } from "@/lib/email/templates";
import { buildIcs } from "@/lib/ics";
import { createLogger } from "@/lib/logging";
import { TokenBucketLimiter, enforceRateLimit } from "@/lib/rate-limit";
import { signStripePayload, verifyStripeWebhook } from "@/lib/stripe/client";
import { computePlatformMetrics } from "@/lib/services/metrics";
import { NOW, makeTenant, makeWorld } from "./helpers";

describe("token-bucket rate limiter", () => {
  it("blocks after the burst, reports retry-after, and refills over time", () => {
    let t = 0;
    const limiter = new TokenBucketLimiter({ capacity: 3, refillPerSecond: 1, now: () => t });
    expect([1, 2, 3].map(() => limiter.take("ip").allowed)).toEqual([true, true, true]);
    const blocked = limiter.take("ip");
    expect(blocked).toMatchObject({ allowed: false, retryAfterSeconds: 1 });
    expect(limiter.take("other").allowed).toBe(true);
    t += 2000;
    expect(limiter.take("ip").allowed).toBe(true);
  });

  it("throws a RATE_LIMITED domain error from enforceRateLimit", () => {
    const limiter = new TokenBucketLimiter({ capacity: 1, refillPerSecond: 0.1 });
    enforceRateLimit(limiter, "k");
    expect(() => enforceRateLimit(limiter, "k")).toThrowError(/Too many requests/);
  });
});

describe("stripe webhook verification", () => {
  const payload = JSON.stringify({
    id: "evt_1",
    object: "event",
    type: "checkout.session.completed",
    data: { object: { metadata: { tenantId: "ten_a", plan: "pro" } } },
  });

  it("accepts a correctly signed payload when a secret is configured", () => {
    const secret = "whsec_test_secret";
    const header = signStripePayload(payload, secret);
    expect(verifyStripeWebhook(payload, header, { secret, mock: true }).type).toBe("checkout.session.completed");
  });

  it("rejects invalid, tampered and missing signatures with WEBHOOK_SIGNATURE", () => {
    const secret = "whsec_test_secret";
    const header = signStripePayload(payload, secret);
    expect(() => verifyStripeWebhook(payload, "t=1,v1=deadbeef", { secret, mock: true })).toThrowError(/verification failed/);
    expect(() => verifyStripeWebhook(payload + " ", header, { secret, mock: true })).toThrowError(/verification failed/);
    expect(() => verifyStripeWebhook(payload, null, { secret, mock: true })).toThrowError(/Missing Stripe-Signature/);
  });

  it("still works unsigned in mock mode without a secret, but never in live mode", () => {
    expect(verifyStripeWebhook(payload, null, { mock: true }).id).toBe("evt_1");
    expect(() => verifyStripeWebhook(payload, null, { mock: false })).toThrowError(/not configured/);
  });

  it("upgrades the tenant plan once per event id (duplicate deliveries are no-ops)", async () => {
    const w = makeWorld({ plan: "free" });
    const body = JSON.stringify({
      id: "evt_dup",
      type: "checkout.session.completed",
      data: { object: { customer: "cus_x", subscription: "sub_x", metadata: { tenantId: "ten_a", plan: "pro" } } },
    });
    const first = await w.c.billing.handleWebhook(body, null);
    const second = await w.c.billing.handleWebhook(body, null);
    expect(first).toMatchObject({ handled: true });
    expect(second).toMatchObject({ duplicate: true });
    expect((await w.c.repos.tenants.get("ten_a"))?.plan).toBe("pro");
    expect(w.mailer.outbox.filter((m) => m.kind === "billing.receipt")).toHaveLength(1);
  });

  it("records churn when a subscription is deleted", async () => {
    const w = makeWorld({ plan: "pro" });
    const body = JSON.stringify({
      id: "evt_del",
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_x", metadata: { tenantId: "ten_a" } } },
    });
    await w.c.billing.handleWebhook(body, null);
    const t = await w.c.repos.tenants.get("ten_a");
    expect(t).toMatchObject({ plan: "free", subscriptionStatus: "canceled", churnedFromPlan: "pro" });
  });
});

describe("platform metrics", () => {
  it("computes MRR, churn and booking conversion", () => {
    const tenants = [
      makeTenant({ id: "t1", plan: "pro" }),
      makeTenant({ id: "t2", plan: "enterprise" }),
      makeTenant({ id: "t3", plan: "free" }),
      makeTenant({ id: "t4", plan: "free", subscriptionStatus: "canceled", churnedFromPlan: "pro", canceledAt: "2026-05-20T00:00:00Z" }),
    ];
    const appt = (id: string, status: "completed" | "cancelled" | "no_show" | "confirmed") => ({
      id, tenantId: "t1", providerId: "p", customerId: "c", serviceId: "s", serviceName: "x", priceCents: 0, currency: "USD",
      startsAt: "2026-06-02T17:00:00Z", endsAt: "2026-06-02T17:30:00Z", status, createdBy: "u", createdAt: "2026-05-30T00:00:00Z", updatedAt: "2026-05-30T00:00:00Z",
    });
    const m = computePlatformMetrics({
      tenants,
      appointments: [appt("1", "completed"), appt("2", "confirmed"), appt("3", "cancelled"), appt("4", "no_show")],
      waitlist: [],
      seatCounts: {},
      now: NOW,
    });
    expect(m.mrr).toBe(49 + 199);
    expect(m.arr).toBe((49 + 199) * 12);
    expect(m.activeSubscriptions).toBe(2);
    expect(m.churn).toMatchObject({ churnedLast30d: 1, churnedMrr: 49 });
    expect(m.churn.ratePct).toBeCloseTo(33.3, 1);
    expect(m.bookings.conversionPct).toBe(50);
  });
});

describe("calendar layout", () => {
  it("places overlapping events side by side and resets between clusters", () => {
    const out = layoutDayEvents([
      { id: "a", startMin: 540, endMin: 600 },
      { id: "b", startMin: 570, endMin: 630 },
      { id: "c", startMin: 720, endMin: 750 },
    ]);
    const by = Object.fromEntries(out.map((p) => [p.event.id, p]));
    expect(by.a).toMatchObject({ column: 0, columns: 2 });
    expect(by.b).toMatchObject({ column: 1, columns: 2 });
    expect(by.c).toMatchObject({ column: 0, columns: 1 });
  });
});

describe("ICS export", () => {
  it("emits a valid VEVENT with UTC times and escaped text", () => {
    const ics = buildIcs({
      uid: "apt_1",
      title: "Consult, follow-up; room 2",
      startsAt: "2026-06-08T17:00:00.000Z",
      endsAt: "2026-06-08T17:30:00.000Z",
      now: NOW,
    });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("DTSTART:20260608T170000Z");
    expect(ics).toContain("DTEND:20260608T173000Z");
    expect(ics).toContain("SUMMARY:Consult\\, follow-up\\; room 2");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});

describe("email templates", () => {
  it("renders local time in the tenant zone and escapes untrusted input", () => {
    const mail = renderBookingConfirmation({
      tenantName: "Alpha <b>Clinic</b>",
      timezone: "America/Los_Angeles",
      customerName: "Pat",
      serviceName: "Consult",
      providerName: "Dr. A",
      startsAt: "2026-06-08T17:00:00.000Z",
      confirmationCode: "APT_1",
      manageUrl: "http://x.test",
    });
    expect(mail.html).toContain("10:00");
    expect(mail.html).toContain("PDT");
    expect(mail.html).not.toContain("<b>Clinic</b>");
    expect(mail.html).toContain("&lt;b&gt;Clinic&lt;/b&gt;");
    expect(mail.text).toContain("APT_1");
    expect(escapeHtml(`"&'`)).toBe("&quot;&amp;&#39;");
  });
});

describe("env validation and logging", () => {
  it("rejects a production config without a session secret", () => {
    expect(() => parseEnv({ NODE_ENV: "production" })).toThrowError(/SESSION_SECRET/);
    expect(parseEnv({ NODE_ENV: "production", SESSION_SECRET: "x".repeat(32) }).DEMO_AUTH_ENABLED).toBe(false);
  });

  it("requires a webhook secret for live Stripe keys in production", () => {
    expect(() =>
      parseEnv({ NODE_ENV: "production", SESSION_SECRET: "x".repeat(32), STRIPE_SECRET_KEY: "sk_live_abc" })
    ).toThrowError(/STRIPE_WEBHOOK_SECRET/);
  });

  it("emits JSON lines carrying the request id", () => {
    const lines: string[] = [];
    const prev = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = "info";
    createLogger({ requestId: "req_12345678" }, (l) => lines.push(l)).info("hello", { tenantId: "t" });
    process.env.LOG_LEVEL = prev;
    expect(JSON.parse(lines[0]!)).toMatchObject({ level: "info", msg: "hello", requestId: "req_12345678", tenantId: "t" });
  });
});
