import { windowsForDay } from "@/lib/availability";
import type { SeedData } from "@/lib/repos/types";
import {
  addDaysToLocalDate,
  localDateString,
  minutesOfDay,
  minutesToTime,
  zonedTimeToUtc,
} from "@/lib/time";
import type {
  Appointment,
  AppointmentStatus,
  AuditEntry,
  AvailabilityWindow,
  Customer,
  DayHours,
  Provider,
  Service,
  Tenant,
  User,
  WaitlistEntry,
} from "@/types";

const DAY = 86_400_000;

function hours(spec: Record<number, [string, string] | null>): DayHours[] {
  return [0, 1, 2, 3, 4, 5, 6].map((day) => {
    const v = spec[day];
    return { day, open: v ? v[0] : null, close: v ? v[1] : null };
  });
}

function weekdays(open: string, close: string): Record<number, [string, string]> {
  return { 1: [open, close], 2: [open, close], 3: [open, close], 4: [open, close], 5: [open, close] };
}

function win(days: number[], start: string, end: string): AvailabilityWindow[] {
  return days.map((dayOfWeek) => ({ dayOfWeek, start, end }));
}

/** Deterministic PRNG so seeded calendars are stable between renders of the same day. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function buildSeed(now: Date = new Date()): SeedData {
  const iso = (offsetDays: number) => new Date(now.getTime() + offsetDays * DAY).toISOString();

  const tenants: Tenant[] = [
    {
      id: "ten_riverside",
      slug: "riverside-clinic",
      name: "Riverside Family Clinic",
      vertical: "clinic",
      subdomain: "riverside",
      plan: "pro",
      subscriptionStatus: "active",
      timezone: "America/Los_Angeles",
      accentColor: "#175a55",
      businessHours: hours({ ...weekdays("08:00", "18:00"), 6: ["09:00", "13:00"], 0: null }),
      cancellationPolicy:
        "Please cancel or reschedule at least 24 hours before your visit. Late cancellations and no-shows may be billed a $40 fee.",
      cancellationWindowHours: 24,
      stripeCustomerId: "cus_riverside",
      stripeSubscriptionId: "sub_riverside",
      createdAt: "2024-03-12T10:00:00Z",
    },
    {
      id: "ten_ironpeak",
      slug: "ironpeak-gym",
      name: "Iron Peak Athletics",
      vertical: "gym",
      subdomain: "ironpeak",
      plan: "enterprise",
      subscriptionStatus: "active",
      timezone: "America/New_York",
      accentColor: "#1d6f68",
      businessHours: hours({ ...weekdays("05:30", "21:00"), 6: ["07:00", "15:00"], 0: ["07:00", "15:00"] }),
      cancellationPolicy: "Sessions cancelled inside 12 hours are charged in full.",
      cancellationWindowHours: 12,
      stripeCustomerId: "cus_ironpeak",
      stripeSubscriptionId: "sub_ironpeak",
      createdAt: "2023-11-02T08:00:00Z",
    },
    {
      id: "ten_brightpath",
      slug: "brightpath-tutoring",
      name: "BrightPath Tutoring",
      vertical: "tutor",
      subdomain: "brightpath",
      plan: "free",
      subscriptionStatus: "active",
      timezone: "America/Chicago",
      accentColor: "#134743",
      businessHours: hours({ ...weekdays("15:00", "20:00"), 6: ["09:00", "15:00"], 0: ["13:00", "20:00"] }),
      cancellationPolicy: "Reschedule at least 4 hours ahead to keep your session credit.",
      cancellationWindowHours: 4,
      createdAt: "2025-01-08T14:00:00Z",
    },
    {
      id: "ten_northgate",
      slug: "northgate-dental",
      name: "Northgate Dental",
      vertical: "dental",
      subdomain: "northgate",
      plan: "pro",
      subscriptionStatus: "trialing",
      timezone: "Europe/London",
      accentColor: "#0d3330",
      businessHours: hours({ ...weekdays("08:30", "17:30"), 6: null, 0: null }),
      cancellationPolicy: "We ask for 48 hours' notice for any change to your appointment.",
      cancellationWindowHours: 48,
      stripeCustomerId: "cus_northgate",
      stripeSubscriptionId: "sub_northgate",
      createdAt: iso(-9),
    },
    {
      id: "ten_harbor",
      slug: "harbor-physio",
      name: "Harbor Physio",
      vertical: "physio",
      subdomain: "harbor",
      plan: "free",
      subscriptionStatus: "canceled",
      timezone: "Australia/Sydney",
      accentColor: "#2a8a80",
      businessHours: hours({ ...weekdays("07:00", "19:00"), 6: null, 0: null }),
      cancellationPolicy: "24 hours' notice required.",
      cancellationWindowHours: 24,
      createdAt: "2024-07-21T01:00:00Z",
      canceledAt: iso(-12),
      churnedFromPlan: "pro",
    },
  ];

  const users: User[] = [
    { id: "usr_platform", email: "ops@clinicbook.app", name: "Ava Morgan", role: "platform_admin", tenantId: null, createdAt: "2023-01-01T00:00:00Z" },
    { id: "usr_dr_chen", email: "chen@riverside-clinic.app", name: "Dr. Maya Chen", role: "owner", tenantId: "ten_riverside", createdAt: "2024-03-12T10:00:00Z" },
    { id: "usr_nurse_li", email: "li@riverside-clinic.app", name: "Nina Li, RN", role: "staff", tenantId: "ten_riverside", createdAt: "2024-03-20T10:00:00Z" },
    { id: "usr_marco", email: "marco@client.test", name: "Marco Delgado", role: "client", tenantId: "ten_riverside", createdAt: "2024-06-01T00:00:00Z" },
    { id: "usr_coach_sam", email: "sam@ironpeak.app", name: "Sam Rivera", role: "owner", tenantId: "ten_ironpeak", createdAt: "2023-11-02T08:00:00Z" },
    { id: "usr_dana", email: "dana@ironpeak.app", name: "Dana Okafor", role: "staff", tenantId: "ten_ironpeak", createdAt: "2024-02-02T08:00:00Z" },
    { id: "usr_alex_tutor", email: "alex@brightpath.app", name: "Alex Jordan", role: "owner", tenantId: "ten_brightpath", createdAt: "2025-01-08T14:00:00Z" },
    { id: "usr_priya", email: "priya@brightpath.app", name: "Priya Shah", role: "staff", tenantId: "ten_brightpath", createdAt: "2025-02-08T14:00:00Z" },
    { id: "usr_hughes", email: "hughes@northgate-dental.app", name: "Dr. Eleanor Hughes", role: "owner", tenantId: "ten_northgate", createdAt: iso(-9) },
    { id: "usr_reid", email: "callum@harbor-physio.app", name: "Callum Reid", role: "owner", tenantId: "ten_harbor", createdAt: "2024-07-21T01:00:00Z" },
  ];

  const providers: Provider[] = [
    {
      id: "prov_chen", tenantId: "ten_riverside", name: "Dr. Maya Chen", title: "Family Medicine",
      bio: "Board-certified physician with twelve years in primary care.",
      specialties: ["Annual physicals", "Pediatrics", "Chronic care"],
      availability: [...win([1, 2, 4], "09:00", "17:00"), ...win([3], "13:00", "18:00")],
    },
    {
      id: "prov_patel", tenantId: "ten_riverside", name: "Dr. Rohan Patel", title: "Dermatology",
      bio: "Medical and cosmetic dermatology, with a focus on early skin-cancer detection.",
      specialties: ["Acne", "Skin exams", "Cosmetic consults"],
      availability: [...win([2, 3, 5], "10:00", "16:00"), ...win([6], "09:00", "13:00")],
    },
    {
      id: "prov_li", tenantId: "ten_riverside", name: "Nina Li, RN", title: "Nurse visits",
      bio: "Immunizations, lab draws and blood-pressure checks.",
      specialties: ["Vaccinations", "Lab draws"],
      availability: win([1, 2, 3, 4, 5], "08:00", "12:00"),
    },
    {
      id: "prov_sam", tenantId: "ten_ironpeak", name: "Sam Rivera", title: "Head Performance Coach",
      bio: "Former collegiate athlete focused on strength and conditioning.",
      specialties: ["Personal training", "Olympic lifting", "Nutrition"],
      availability: [...win([1, 3, 5], "06:00", "14:00"), ...win([2, 4], "12:00", "20:00")],
    },
    {
      id: "prov_dana", tenantId: "ten_ironpeak", name: "Dana Okafor", title: "Mobility Coach",
      bio: "Movement screening and injury-aware programming.",
      specialties: ["Mobility", "Return to training"],
      availability: [...win([1, 2, 3, 4, 5], "09:00", "18:00"), ...win([6], "08:00", "13:00")],
    },
    {
      id: "prov_alex", tenantId: "ten_brightpath", name: "Alex Jordan", title: "SAT/ACT Specialist",
      bio: "Has coached 200+ students to their target scores.",
      specialties: ["SAT prep", "Calculus", "Essay coaching"],
      availability: [...win([2, 4], "16:00", "20:00"), ...win([6], "09:00", "15:00"), ...win([0], "14:00", "20:00")],
    },
    {
      id: "prov_hughes", tenantId: "ten_northgate", name: "Dr. Eleanor Hughes", title: "General Dentistry",
      bio: "Preventive and restorative dentistry for the whole family.",
      specialties: ["Check-ups", "Hygiene", "Whitening"],
      availability: win([1, 2, 3, 4, 5], "09:00", "17:00"),
    },
    {
      id: "prov_reid", tenantId: "ten_harbor", name: "Callum Reid", title: "Physiotherapist",
      bio: "Sports and post-operative rehabilitation.",
      specialties: ["Rehab", "Sports injuries"],
      availability: win([1, 2, 3, 4, 5], "08:00", "18:00"),
    },
  ];

  const svc = (
    id: string, tenantId: string, name: string, description: string,
    durationMinutes: number, priceCents: number, currency = "USD", providerIds: string[] = []
  ): Service => ({ id, tenantId, name, description, durationMinutes, priceCents, currency, active: true, providerIds });

  const services: Service[] = [
    svc("svc_physical", "ten_riverside", "Annual physical", "Comprehensive preventive exam with bloodwork orders.", 60, 18000, "USD", ["prov_chen"]),
    svc("svc_followup", "ten_riverside", "Follow-up visit", "Review results or adjust a treatment plan.", 30, 9500, "USD", ["prov_chen"]),
    svc("svc_derm", "ten_riverside", "Dermatology consult", "New-concern evaluation and treatment plan.", 30, 14000, "USD", ["prov_patel"]),
    svc("svc_skin", "ten_riverside", "Full-body skin check", "Head-to-toe screening exam.", 45, 16500, "USD", ["prov_patel"]),
    svc("svc_vax", "ten_riverside", "Vaccination", "Seasonal and travel immunizations.", 15, 3500, "USD", ["prov_li"]),
    svc("svc_lab", "ten_riverside", "Lab draw", "Fasting or routine blood collection.", 15, 2500, "USD", ["prov_li"]),
    svc("svc_strength", "ten_ironpeak", "1:1 strength session", "Programmed barbell and accessory work.", 60, 8500, "USD", ["prov_sam"]),
    svc("svc_mobility", "ten_ironpeak", "Mobility assessment", "Movement screen and take-home plan.", 45, 6000, "USD", ["prov_dana"]),
    svc("svc_nutrition", "ten_ironpeak", "Nutrition consult", "Habit-based nutrition planning.", 30, 4500, "USD", ["prov_sam"]),
    svc("svc_sat", "ten_brightpath", "SAT strategy session", "Section pacing and error-log review.", 60, 7000),
    svc("svc_calc", "ten_brightpath", "Calculus tutoring", "AP Calculus AB/BC concepts and practice.", 60, 6500),
    svc("svc_essay", "ten_brightpath", "Essay coaching", "Structure and voice for application essays.", 45, 5000),
    svc("svc_checkup", "ten_northgate", "Check-up and clean", "Examination, scale and polish.", 45, 7500, "GBP"),
    svc("svc_white", "ten_northgate", "Whitening consultation", "Options, pricing and a shade plan.", 30, 3500, "GBP"),
    svc("svc_assess", "ten_harbor", "Initial assessment", "Full movement and history assessment.", 60, 14000, "AUD"),
  ];

  const cust = (
    id: string, tenantId: string, name: string, email: string, createdOffset: number, phone?: string, notes?: string
  ): Customer => ({ id, tenantId, name, email, phone, notes, createdAt: iso(createdOffset) });

  const customers: Customer[] = [
    cust("cus_marco", "ten_riverside", "Marco Delgado", "marco@client.test", -420, "+1 415-555-0182", "Prefers morning slots"),
    cust("cus_jenny", "ten_riverside", "Jenny Wu", "jenny.wu@email.test", -300, "+1 415-555-0199"),
    cust("cus_omar", "ten_riverside", "Omar Haddad", "omar.haddad@email.test", -210, "+1 510-555-0114", "Penicillin allergy"),
    cust("cus_lena", "ten_riverside", "Lena Fischer", "lena.fischer@email.test", -150),
    cust("cus_tomas", "ten_riverside", "Tomas Alvarez", "tomas.alvarez@email.test", -90, "+1 628-555-0163"),
    cust("cus_ruth", "ten_riverside", "Ruth Kim", "ruth.kim@email.test", -45),
    cust("cus_tyler", "ten_ironpeak", "Tyler Brooks", "tyler@email.test", -380),
    cust("cus_amara", "ten_ironpeak", "Amara Nwosu", "amara.nwosu@email.test", -200),
    cust("cus_jonas", "ten_ironpeak", "Jonas Berg", "jonas.berg@email.test", -120),
    cust("cus_sofia", "ten_brightpath", "Sofia Nguyen", "sofia.student@test.dev", -250),
    cust("cus_ethan", "ten_brightpath", "Ethan Cole", "ethan.cole@email.test", -100),
    cust("cus_poppy", "ten_northgate", "Poppy Ashworth", "poppy.ashworth@email.test", -8),
    cust("cus_idris", "ten_northgate", "Idris Khan", "idris.khan@email.test", -6),
    cust("cus_ben", "ten_harbor", "Ben Taylor", "ben.taylor@email.test", -300),
  ];

  // ---- generated appointment history + upcoming schedule -------------------------------------
  const appointments: Appointment[] = [];
  const audit: AuditEntry[] = [];
  const tenantById = new Map(tenants.map((t) => [t.id, t]));

  for (const provider of providers) {
    const tenant = tenantById.get(provider.tenantId)!;
    if (tenant.subscriptionStatus === "canceled" && tenant.id !== "ten_harbor") continue;
    const rand = mulberry32(hash(provider.id));
    const offered = services.filter(
      (s) => s.tenantId === tenant.id && (s.providerIds.length === 0 || s.providerIds.includes(provider.id))
    );
    const tenantCustomers = customers.filter((c) => c.tenantId === tenant.id);
    const today = localDateString(now, tenant.timezone);
    const range = tenant.id === "ten_brightpath" ? [-8, 10] : [-14, 14];

    for (let off = range[0]!; off <= range[1]!; off++) {
      if (tenant.id === "ten_harbor" && off > -13) continue;
      if (tenant.id === "ten_northgate" && off < -8) continue;
      const date = addDaysToLocalDate(today, off);
      for (const w of windowsForDay(tenant, provider, date)) {
        let cursor = minutesOfDay(w.start);
        const end = minutesOfDay(w.end);
        while (cursor < end) {
          const service = offered[Math.floor(rand() * offered.length)]!;
          const fill = tenant.plan === "free" ? 0.2 : provider.id === "prov_li" ? 0.22 : 0.3;
          if (cursor + service.durationMinutes <= end && rand() < fill) {
            const starts = zonedTimeToUtc(date, minutesToTime(cursor), tenant.timezone);
            if (starts) {
              const ends = new Date(starts.getTime() + service.durationMinutes * 60_000);
              const past = ends.getTime() < now.getTime();
              const roll = rand();
              let status: AppointmentStatus;
              if (past) status = roll < 0.82 ? "completed" : roll < 0.9 ? "no_show" : "cancelled";
              else status = roll < 0.12 ? "cancelled" : roll < 0.65 ? "confirmed" : "scheduled";
              const customer = tenantCustomers[Math.floor(rand() * tenantCustomers.length)]!;
              const id = `apt_seed_${provider.id.slice(5)}_${appointments.length}`;
              const createdAt = new Date(starts.getTime() - (2 + rand() * 6) * DAY).toISOString();
              appointments.push({
                id,
                tenantId: tenant.id,
                providerId: provider.id,
                customerId: customer.id,
                serviceId: service.id,
                serviceName: service.name,
                priceCents: service.priceCents,
                currency: service.currency,
                startsAt: starts.toISOString(),
                endsAt: ends.toISOString(),
                status,
                notes: rand() < 0.12 ? "Bring previous records." : undefined,
                createdBy: "usr_seed",
                createdAt,
                updatedAt: createdAt,
              });
              if (!past && audit.filter((a) => a.tenantId === tenant.id).length < 8) {
                const ownerId = users.find((u) => u.tenantId === tenant.id && u.role === "owner")!;
                audit.push({
                  id: `aud_seed_${audit.length}`,
                  tenantId: tenant.id,
                  at: createdAt,
                  actorId: ownerId.id,
                  actorName: ownerId.name,
                  actorRole: "owner",
                  action: "appointment.created",
                  entityType: "appointment",
                  entityId: id,
                  summary: `Booked ${service.name} for ${customer.name} with ${provider.name}`,
                  after: { status: "scheduled" },
                });
              }
              cursor += service.durationMinutes;
              continue;
            }
          }
          cursor += 30;
        }
      }
    }
  }

  // Seed a deterministic appointment for the demo client so "my appointments" is never empty.
  const chen = providers[0]!;
  const riverside = tenantById.get("ten_riverside")!;
  const marcoDate = addDaysToLocalDate(localDateString(now, riverside.timezone), 5);
  const marcoStart = zonedTimeToUtc(marcoDate, "10:00", riverside.timezone);
  if (marcoStart && windowsForDay(riverside, chen, marcoDate).length > 0) {
    const clash = appointments.some(
      (a) =>
        a.providerId === chen.id &&
        a.status !== "cancelled" &&
        Date.parse(a.startsAt) < marcoStart.getTime() + 3_600_000 &&
        Date.parse(a.endsAt) > marcoStart.getTime()
    );
    if (!clash) {
      appointments.push({
        id: "apt_marco_upcoming",
        tenantId: riverside.id,
        providerId: chen.id,
        customerId: "cus_marco",
        serviceId: "svc_followup",
        serviceName: "Follow-up visit",
        priceCents: 9500,
        currency: "USD",
        startsAt: marcoStart.toISOString(),
        endsAt: new Date(marcoStart.getTime() + 30 * 60_000).toISOString(),
        status: "confirmed",
        notes: "Bring insurance card",
        createdBy: "usr_marco",
        createdAt: iso(-2),
        updatedAt: iso(-2),
      });
    }
  }

  const rsDate = addDaysToLocalDate(localDateString(now, riverside.timezone), 2);
  const waitlist: WaitlistEntry[] = [
    { id: "wl_seed_1", tenantId: "ten_riverside", providerId: "prov_chen", serviceId: "svc_followup", customerId: "cus_jenny", desiredDate: rsDate, note: "Any time after 1 PM", status: "waiting", createdAt: iso(-1) },
    { id: "wl_seed_2", tenantId: "ten_riverside", providerId: "prov_patel", serviceId: "svc_skin", customerId: "cus_ruth", desiredDate: addDaysToLocalDate(rsDate, 1), status: "waiting", createdAt: iso(-0.5) },
  ];

  return { tenants, users, providers, services, customers, appointments, waitlist, audit };
}
