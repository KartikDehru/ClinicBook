import { describe, expect, it } from "vitest";
import {
  addDaysToLocalDate,
  localDateString,
  startOfLocalWeek,
  tzOffsetMs,
  zonedTimeToUtc,
} from "@/lib/time";

describe("timezone helpers", () => {
  it("converts local wall time to UTC using the zone's offset at that date", () => {
    // PDT (UTC-7) vs PST (UTC-8)
    expect(zonedTimeToUtc("2026-06-08", "09:00", "America/Los_Angeles")?.toISOString()).toBe("2026-06-08T16:00:00.000Z");
    expect(zonedTimeToUtc("2026-01-12", "09:00", "America/Los_Angeles")?.toISOString()).toBe("2026-01-12T17:00:00.000Z");
  });

  it("handles zones east of UTC and half-hour offsets", () => {
    expect(zonedTimeToUtc("2026-06-08", "09:00", "Europe/London")?.toISOString()).toBe("2026-06-08T08:00:00.000Z");
    expect(zonedTimeToUtc("2026-06-08", "09:00", "Australia/Sydney")?.toISOString()).toBe("2026-06-07T23:00:00.000Z");
    expect(tzOffsetMs(new Date("2026-06-08T00:00:00Z"), "Asia/Kolkata")).toBe(5.5 * 3_600_000);
  });

  it("returns null for wall-clock times skipped by a DST spring-forward", () => {
    // 2026-03-08 02:30 does not exist in America/Los_Angeles
    expect(zonedTimeToUtc("2026-03-08", "02:30", "America/Los_Angeles")).toBeNull();
    expect(zonedTimeToUtc("2026-03-08", "03:30", "America/Los_Angeles")?.toISOString()).toBe("2026-03-08T10:30:00.000Z");
  });

  it("derives the local date from an instant, not the UTC date", () => {
    const instant = new Date("2026-06-08T02:00:00Z"); // still Sunday evening in LA
    expect(localDateString(instant, "America/Los_Angeles")).toBe("2026-06-07");
    expect(localDateString(instant, "Asia/Tokyo")).toBe("2026-06-08");
  });

  it("computes Monday-based weeks across month boundaries", () => {
    expect(startOfLocalWeek("2026-06-07")).toBe("2026-06-01"); // Sunday belongs to the prior Monday's week
    expect(startOfLocalWeek("2026-06-01")).toBe("2026-06-01");
    expect(addDaysToLocalDate("2026-12-30", 3)).toBe("2027-01-02");
  });
});
