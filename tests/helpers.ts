import { createContainer, type Container } from "@/lib/container";
import { OutboxMailer } from "@/lib/email/mailer";
import { createMemoryRepositories } from "@/lib/repos/memory";
import { actorFromUser } from "@/lib/auth/rbac";
import type { Actor, DayHours, PlanTier, Provider, Service, Tenant, User } from "@/types";

/** Monday 2026-06-01 12:00 UTC (05:00 in Los Angeles). */
export const NOW = new Date("2026-06-01T12:00:00Z");

export function hours(spec: Record<number, [string, string] | null>): DayHours[] {
  return [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    open: spec[day]?.[0] ?? null,
    close: spec[day]?.[1] ?? null,
  }));
}

export function makeTenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: "ten_a",
    slug: "alpha",
    name: "Alpha Clinic",
    vertical: "clinic",
    subdomain: "alpha",
    plan: "pro",
    subscriptionStatus: "active",
    timezone: "America/Los_Angeles",
    accentColor: "#175a55",
    businessHours: hours({ 1: ["08:00", "18:00"], 2: ["08:00", "18:00"], 3: ["08:00", "18:00"], 4: ["08:00", "18:00"], 5: ["08:00", "18:00"] }),
    cancellationPolicy: "24h notice",
    cancellationWindowHours: 24,
    createdAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeProvider(tenantId = "ten_a", id = "prov_a"): Provider {
  return { id, tenantId, name: "Dr. A", title: "GP", bio: "", specialties: [], availability: [] };
}

export function makeService(tenantId = "ten_a", id = "svc_a", durationMinutes = 30): Service {
  return {
    id, tenantId, name: "Consult", description: "", durationMinutes,
    priceCents: 10000, currency: "USD", active: true, providerIds: [],
  };
}

export function makeUser(id: string, role: User["role"], tenantId: string | null, email = `${id}@test.dev`): User {
  return { id, email, name: id, role, tenantId, createdAt: "2025-01-01T00:00:00Z" };
}

export interface World {
  c: Container;
  mailer: OutboxMailer;
  owner: Actor;
  staff: Actor;
  client: Actor;
  admin: Actor;
  otherOwner: Actor;
  setNow(d: Date): void;
}

export function makeWorld(opts: { plan?: PlanTier; timezone?: string } = {}): World {
  let current = NOW;
  const mailer = new OutboxMailer();
  const tenantA = makeTenant({ plan: opts.plan ?? "pro", timezone: opts.timezone ?? "America/Los_Angeles" });
  const tenantB = makeTenant({ id: "ten_b", slug: "beta", subdomain: "beta", name: "Beta Gym", timezone: "America/Chicago" });
  const users = [
    makeUser("owner_a", "owner", "ten_a"),
    makeUser("staff_a", "staff", "ten_a"),
    makeUser("client_a", "client", "ten_a", "pat@client.test"),
    makeUser("owner_b", "owner", "ten_b"),
    makeUser("admin", "platform_admin", null),
  ];
  const repos = createMemoryRepositories({
    tenants: [tenantA, tenantB],
    users,
    providers: [makeProvider("ten_a", "prov_a"), makeProvider("ten_b", "prov_b")],
    services: [makeService("ten_a", "svc_a"), makeService("ten_b", "svc_b")],
    customers: [
      { id: "cus_a", tenantId: "ten_a", name: "Pat Client", email: "pat@client.test", createdAt: NOW.toISOString() },
      { id: "cus_a2", tenantId: "ten_a", name: "Quinn Client", email: "quinn@client.test", createdAt: NOW.toISOString() },
      { id: "cus_b", tenantId: "ten_b", name: "Bea Client", email: "bea@client.test", createdAt: NOW.toISOString() },
    ],
  });
  const c = createContainer({ repos, mailer, now: () => current, appUrl: "http://test.local" });
  const actor = (id: string) => actorFromUser(users.find((u) => u.id === id)!);
  return {
    c,
    mailer,
    owner: actor("owner_a"),
    staff: actor("staff_a"),
    client: actor("client_a"),
    admin: actor("admin"),
    otherOwner: actor("owner_b"),
    setNow: (d) => {
      current = d;
    },
  };
}

/** Monday 2026-06-08 at 10:00 America/Los_Angeles (PDT, UTC-7). */
export const MON_10AM_LA = "2026-06-08T17:00:00.000Z";
