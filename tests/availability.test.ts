import { describe, expect, it } from "vitest";
import { computeSlots, fitsWithinHours, windowsForDay } from "@/lib/availability";
import { NOW, hours, makeProvider, makeTenant } from "./helpers";

describe("availability", () => {
  const tenant = makeTenant();
  const provider = makeProvider();

  it("generates slots in the tenant timezone, not the server timezone", () => {
    const slots = computeSlots({
      tenant, provider, durationMinutes: 30, busy: [], fromDate: "2026-06-08", days: 1, now: NOW,
    });
    expect(slots[0]?.localTime).toBe("08:00");
    expect(slots[0]?.startsAt).toBe("2026-06-08T15:00:00.000Z"); // 08:00 PDT
    expect(slots.at(-1)?.localTime).toBe("17:30");
    expect(slots).toHaveLength(20);
  });

  it("keeps local wall-clock hours stable across a DST change", () => {
    const before = computeSlots({ tenant, provider, durationMinutes: 60, busy: [], fromDate: "2026-03-06", days: 1, now: new Date("2026-03-01T00:00:00Z") });
    const after = computeSlots({ tenant, provider, durationMinutes: 60, busy: [], fromDate: "2026-03-09", days: 1, now: new Date("2026-03-01T00:00:00Z") });
    expect(before[0]?.localTime).toBe("08:00");
    expect(after[0]?.localTime).toBe("08:00");
    expect(before[0]?.startsAt).toBe("2026-03-06T16:00:00.000Z"); // PST
    expect(after[0]?.startsAt).toBe("2026-03-09T15:00:00.000Z"); // PDT
  });

  it("removes slots that overlap live appointments but ignores cancelled ones", () => {
    const busy = [
      { startsAt: "2026-06-08T16:00:00.000Z", endsAt: "2026-06-08T16:30:00.000Z", status: "confirmed" as const },
      { startsAt: "2026-06-08T17:00:00.000Z", endsAt: "2026-06-08T17:30:00.000Z", status: "cancelled" as const },
    ];
    const slots = computeSlots({ tenant, provider, durationMinutes: 30, busy, fromDate: "2026-06-08", days: 1, now: NOW });
    const times = slots.map((s) => s.localTime);
    expect(times).not.toContain("09:00");
    expect(times).toContain("10:00");
  });

  it("intersects provider availability with business hours", () => {
    const p = { ...makeProvider(), availability: [{ dayOfWeek: 1, start: "06:00", end: "10:00" }] };
    expect(windowsForDay(tenant, p, "2026-06-08")).toEqual([{ start: "08:00", end: "10:00" }]);
    expect(windowsForDay(tenant, p, "2026-06-09")).toEqual([]);
  });

  it("returns no slots on closed days", () => {
    const closed = makeTenant({ businessHours: hours({}) });
    expect(computeSlots({ tenant: closed, provider, durationMinutes: 30, busy: [], fromDate: "2026-06-08", days: 7, now: NOW })).toEqual([]);
  });

  it("detects appointments that straddle closing time or midnight", () => {
    const starts = new Date("2026-06-09T00:45:00.000Z"); // 17:45 PDT Monday
    expect(fitsWithinHours(tenant, provider, starts, new Date(starts.getTime() + 15 * 60_000))).toBe(true);
    expect(fitsWithinHours(tenant, provider, starts, new Date(starts.getTime() + 30 * 60_000))).toBe(false);
  });
});
