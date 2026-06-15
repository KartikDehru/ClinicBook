import { describe, expect, it } from "vitest";
import { AppointmentError } from "@/lib/errors";
import { MON_10AM_LA, makeWorld } from "./helpers";

const base = {
  tenantId: "ten_a",
  providerId: "prov_a",
  serviceId: "svc_a",
  customerId: "cus_a",
  startsAt: MON_10AM_LA,
};

async function expectCode(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toMatchObject({ name: "AppointmentError", code });
}

describe("booking conflicts and hours", () => {
  it("books an available slot and records the service snapshot", async () => {
    const w = makeWorld();
    const { appointment } = await w.c.appointments.book(w.staff, base);
    expect(appointment.status).toBe("scheduled");
    expect(appointment.endsAt).toBe("2026-06-08T17:30:00.000Z");
    expect(appointment.serviceName).toBe("Consult");
    expect(appointment.priceCents).toBe(10000);
  });

  it("rejects an overlapping booking for the same provider with SLOT_TAKEN (409)", async () => {
    const w = makeWorld();
    await w.c.appointments.book(w.staff, base);
    const overlap = { ...base, customerId: "cus_a2", startsAt: "2026-06-08T17:15:00.000Z" };
    const err = await w.c.appointments.book(w.staff, overlap).catch((e) => e);
    expect(err).toBeInstanceOf(AppointmentError);
    expect(err.code).toBe("SLOT_TAKEN");
    expect(err.status).toBe(409);
    expect(err.toJSON()).toMatchObject({ error: { code: "SLOT_TAKEN", message: expect.any(String) } });
  });

  it("allows the same slot again after cancellation", async () => {
    const w = makeWorld();
    const { appointment } = await w.c.appointments.book(w.staff, base);
    await w.c.appointments.transition(w.staff, appointment.id, "cancel");
    await expect(w.c.appointments.book(w.staff, { ...base, customerId: "cus_a2" })).resolves.toBeTruthy();
  });

  it("allows back-to-back appointments (end == next start)", async () => {
    const w = makeWorld();
    await w.c.appointments.book(w.staff, base);
    await expect(
      w.c.appointments.book(w.staff, { ...base, customerId: "cus_a2", startsAt: "2026-06-08T17:30:00.000Z" })
    ).resolves.toBeTruthy();
  });

  it("serialises concurrent bookings: exactly one wins", async () => {
    const w = makeWorld();
    const results = await Promise.allSettled([
      w.c.appointments.book(w.staff, base),
      w.c.appointments.book(w.owner, { ...base, customerId: "cus_a2" }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason.code).toBe("SLOT_TAKEN");
  });

  it("rejects times outside business hours with OUTSIDE_HOURS (422)", async () => {
    const w = makeWorld();
    // 06:00 PDT Monday, before the 08:00 opening
    const err = await w.c.appointments.book(w.staff, { ...base, startsAt: "2026-06-08T13:00:00.000Z" }).catch((e) => e);
    expect(err.code).toBe("OUTSIDE_HOURS");
    expect(err.status).toBe(422);
    // Sunday is closed
    await expectCode(w.c.appointments.book(w.staff, { ...base, startsAt: "2026-06-07T17:00:00.000Z" }), "OUTSIDE_HOURS");
  });

  it("rejects bookings in the past", async () => {
    const w = makeWorld();
    await expectCode(w.c.appointments.book(w.staff, { ...base, startsAt: "2026-05-25T17:00:00.000Z" }), "VALIDATION_FAILED");
  });
});

describe("tenant isolation (TENANT_MISMATCH)", () => {
  it("blocks a staff member from booking into another tenant", async () => {
    const w = makeWorld();
    const err = await w.c.appointments
      .book(w.staff, { ...base, tenantId: "ten_b", providerId: "prov_b", serviceId: "svc_b", customerId: "cus_b" })
      .catch((e) => e);
    expect(err.code).toBe("TENANT_MISMATCH");
    expect(err.status).toBe(403);
  });

  it("rejects a provider/service/customer that belongs to a different tenant than the request", async () => {
    const w = makeWorld();
    await expectCode(w.c.appointments.book(w.staff, { ...base, providerId: "prov_b" }), "TENANT_MISMATCH");
    await expectCode(w.c.appointments.book(w.staff, { ...base, serviceId: "svc_b" }), "TENANT_MISMATCH");
    await expectCode(w.c.appointments.book(w.staff, { ...base, customerId: "cus_b" }), "TENANT_MISMATCH");
  });

  it("prevents reading or mutating another tenant's appointment by id", async () => {
    const w = makeWorld();
    const { appointment } = await w.c.appointments.book(w.staff, base);
    await expectCode(w.c.appointments.get(w.otherOwner, appointment.id), "TENANT_MISMATCH");
    await expectCode(w.c.appointments.transition(w.otherOwner, appointment.id, "cancel"), "TENANT_MISMATCH");
  });
});

describe("idempotency", () => {
  it("returns the original appointment for a repeated Idempotency-Key", async () => {
    const w = makeWorld();
    const first = await w.c.appointments.book(w.staff, base, { idempotencyKey: "key-aaaaaaaa-1" });
    const second = await w.c.appointments.book(w.staff, base, { idempotencyKey: "key-aaaaaaaa-1" });
    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(second.appointment.id).toBe(first.appointment.id);
    const all = await w.c.repos.appointments.list({ tenantId: "ten_a" });
    expect(all).toHaveLength(1);
    expect(w.mailer.outbox.filter((m) => m.kind === "booking.confirmed")).toHaveLength(1);
  });

  it("coalesces concurrent requests that share a key", async () => {
    const w = makeWorld();
    const [a, b] = await Promise.all([
      w.c.appointments.book(w.staff, base, { idempotencyKey: "key-concurrent-1" }),
      w.c.appointments.book(w.staff, base, { idempotencyKey: "key-concurrent-1" }),
    ]);
    expect(a.appointment.id).toBe(b.appointment.id);
    expect(await w.c.repos.appointments.list({ tenantId: "ten_a" })).toHaveLength(1);
  });

  it("rejects reuse of a key with a different payload (IDEMPOTENCY_MISMATCH)", async () => {
    const w = makeWorld();
    await w.c.appointments.book(w.staff, base, { idempotencyKey: "key-mismatch-1" });
    await expectCode(
      w.c.appointments.book(w.staff, { ...base, startsAt: "2026-06-08T18:00:00.000Z" }, { idempotencyKey: "key-mismatch-1" }),
      "IDEMPOTENCY_MISMATCH"
    );
  });

  it("scopes keys per tenant", async () => {
    const w = makeWorld();
    const a = await w.c.appointments.book(w.staff, base, { idempotencyKey: "shared-key-1234" });
    const b = await w.c.appointments.book(
      w.otherOwner,
      { tenantId: "ten_b", providerId: "prov_b", serviceId: "svc_b", customerId: "cus_b", startsAt: "2026-06-08T18:00:00.000Z" },
      { idempotencyKey: "shared-key-1234" }
    );
    expect(b.replayed).toBe(false);
    expect(b.appointment.id).not.toBe(a.appointment.id);
  });

  it("does not cache failures, so the same key can be retried after SLOT_TAKEN", async () => {
    const w = makeWorld();
    const blocker = await w.c.appointments.book(w.staff, base);
    await expectCode(
      w.c.appointments.book(w.staff, { ...base, customerId: "cus_a2" }, { idempotencyKey: "key-retry-1234" }),
      "SLOT_TAKEN"
    );
    await w.c.appointments.transition(w.staff, blocker.appointment.id, "cancel");
    const retry = await w.c.appointments.book(w.staff, { ...base, customerId: "cus_a2" }, { idempotencyKey: "key-retry-1234" });
    expect(retry.replayed).toBe(false);
  });
});

describe("plan gating", () => {
  it("caps free-plan bookings per month with PLAN_LIMIT (402)", async () => {
    const w = makeWorld({ plan: "free" });
    // Free plan allows 50 / month; fill June with 50 appointments for one provider on weekdays.
    const days = ["08", "09", "10", "11", "12", "15", "16", "17", "18", "19"]; // 10 weekdays
    let count = 0;
    outer: for (const d of days) {
      for (let h = 15; h < 25 && count < 50; h++) {
        // 08:00-18:00 PDT == 15:00Z-01:00Z next day; use hourly steps
        const hour = h % 24;
        const day = h >= 24 ? String(Number(d) + 1).padStart(2, "0") : d;
        await w.c.appointments.book(w.staff, { ...base, startsAt: `2026-06-${day}T${String(hour).padStart(2, "0")}:00:00.000Z`, customerId: "cus_a" });
        count++;
        if (count === 50) break outer;
      }
    }
    expect(count).toBe(50);
    const err = await w.c.appointments
      .book(w.staff, { ...base, startsAt: "2026-06-22T17:00:00.000Z" })
      .catch((e) => e);
    expect(err.code).toBe("PLAN_LIMIT");
    expect(err.status).toBe(402);
  });

  it("gates the waitlist to paid plans", async () => {
    const free = makeWorld({ plan: "free" });
    await expectCode(
      free.c.waitlist.join(free.staff, { tenantId: "ten_a", providerId: "prov_a", serviceId: "svc_a", customerId: "cus_a", desiredDate: "2026-06-08" }),
      "PLAN_LIMIT"
    );
    const pro = makeWorld({ plan: "pro" });
    const entry = await pro.c.waitlist.join(pro.staff, { tenantId: "ten_a", providerId: "prov_a", serviceId: "svc_a", customerId: "cus_a", desiredDate: "2026-06-08" });
    expect(entry.status).toBe("waiting");
  });
});

describe("seat limits", () => {
  it("blocks staff invites past the plan seat limit with SEAT_LIMIT", async () => {
    const w = makeWorld({ plan: "free" }); // 2 seats: owner_a + staff_a already used
    const err = await w.c.tenantAdmin.inviteStaff(w.owner, "ten_a", { name: "New Hire", email: "new@x.test" }).catch((e) => e);
    expect(err.code).toBe("SEAT_LIMIT");
    expect(err.status).toBe(402);
  });

  it("allows invites while seats remain and audits them", async () => {
    const w = makeWorld({ plan: "pro" });
    const user = await w.c.tenantAdmin.inviteStaff(w.owner, "ten_a", { name: "New Hire", email: "new@x.test" });
    expect(user.role).toBe("staff");
    expect(await w.c.tenantAdmin.seatUsage("ten_a")).toEqual({ used: 3, limit: 10 });
    const log = await w.c.audit.list(w.owner, "ten_a");
    expect(log.some((e) => e.action === "user.invited")).toBe(true);
  });
});

describe("RBAC", () => {
  it("returns UNAUTHORIZED without a session", async () => {
    const w = makeWorld();
    const err = await w.c.appointments.book(null, base).catch((e) => e);
    expect(err.code).toBe("UNAUTHORIZED");
    expect(err.status).toBe(401);
  });

  it("limits clients to their own appointments and to cancel/reschedule", async () => {
    const w = makeWorld();
    const mine = await w.c.appointments.book(w.client, { ...base, customerId: undefined });
    const others = await w.c.appointments.book(w.staff, { ...base, customerId: "cus_a2", startsAt: "2026-06-08T18:00:00.000Z" });

    expect(await w.c.appointments.list(w.client, { tenantId: "ten_a" })).toHaveLength(1);
    await expectCode(w.c.appointments.get(w.client, others.appointment.id), "FORBIDDEN");
    await expectCode(w.c.appointments.transition(w.client, mine.appointment.id, "complete"), "FORBIDDEN");
    await expect(w.c.appointments.transition(w.client, mine.appointment.id, "cancel")).resolves.toMatchObject({ status: "cancelled" });
  });

  it("enforces role permissions for settings, billing and admin metrics", async () => {
    const w = makeWorld();
    await expectCode(w.c.tenantAdmin.updateSettings(w.staff, "ten_a", { cancellationPolicy: "x" }), "FORBIDDEN");
    await expectCode(w.c.billing.createCheckout(w.staff, "ten_a", "pro"), "FORBIDDEN");
    await expectCode(w.c.customers.list(w.client, "ten_a"), "FORBIDDEN");
    await expectCode(w.c.metrics.platform(w.owner), "FORBIDDEN");
    await expect(w.c.metrics.platform(w.admin)).resolves.toBeTruthy();
  });

  it("enforces the cancellation window for clients but not staff", async () => {
    const w = makeWorld();
    const { appointment } = await w.c.appointments.book(w.client, { ...base, customerId: undefined });
    w.setNow(new Date("2026-06-08T00:00:00Z")); // 17h before start, window is 24h
    await expectCode(w.c.appointments.transition(w.client, appointment.id, "cancel"), "POLICY_VIOLATION");
    await expect(w.c.appointments.transition(w.staff, appointment.id, "cancel")).resolves.toMatchObject({ status: "cancelled" });
  });
});

describe("lifecycle, audit log and waitlist offers", () => {
  it("writes who/when/what for every mutation", async () => {
    const w = makeWorld();
    const { appointment } = await w.c.appointments.book(w.staff, base);
    await w.c.appointments.transition(w.staff, appointment.id, "confirm");
    await w.c.appointments.reschedule(w.owner, appointment.id, "2026-06-08T18:00:00.000Z");
    await w.c.appointments.transition(w.owner, appointment.id, "cancel", { reason: "Patient request" });

    const log = await w.c.audit.list(w.owner, "ten_a", { entityId: appointment.id });
    expect(log.map((e) => e.action).sort()).toEqual([
      "appointment.cancelled",
      "appointment.confirmed",
      "appointment.created",
      "appointment.rescheduled",
    ]);
    const cancelled = log.find((e) => e.action === "appointment.cancelled")!;
    expect(cancelled).toMatchObject({ actorId: "owner_a", actorRole: "owner", before: { status: "confirmed" } });
    expect(cancelled.at).toBe("2026-06-01T12:00:00.000Z");
  });

  it("rejects invalid transitions (INVALID_STATE)", async () => {
    const w = makeWorld();
    const { appointment } = await w.c.appointments.book(w.staff, base);
    await w.c.appointments.transition(w.staff, appointment.id, "cancel");
    await expectCode(w.c.appointments.transition(w.staff, appointment.id, "confirm"), "INVALID_STATE");
    await expectCode(w.c.appointments.reschedule(w.staff, appointment.id, "2026-06-08T18:00:00.000Z"), "INVALID_STATE");
  });

  it("offers a freed slot to the oldest matching waitlist entry and emails them", async () => {
    const w = makeWorld({ plan: "pro" });
    const { appointment } = await w.c.appointments.book(w.staff, base);
    const entry = await w.c.waitlist.join(w.staff, {
      tenantId: "ten_a", providerId: "prov_a", serviceId: "svc_a", customerId: "cus_a2", desiredDate: "2026-06-08",
    });
    await w.c.appointments.transition(w.staff, appointment.id, "cancel");
    const after = (await w.c.waitlist.list(w.staff, "ten_a")).find((e) => e.id === entry.id)!;
    expect(after.status).toBe("offered");
    expect(w.mailer.outbox.some((m) => m.kind === "waitlist.offer" && m.to === "quinn@client.test")).toBe(true);
  });
});
