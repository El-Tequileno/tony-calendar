import { describe, expect, it } from "vitest";
import { calendarToday } from "../src/lib/dates";
import { entrySchema } from "../src/lib/validation";
import { entryFixtures } from "./fixtures";

describe("past-day scheduling", () => {
  it("uses the calendar time zone for today", () => {
    expect(calendarToday(new Date("2026-10-17T03:00:00Z"))).toBe("2026-10-16");
    expect(calendarToday(new Date("2026-10-17T06:00:00Z"))).toBe("2026-10-17");
  });

  it("accepts past dates for visits and events while enforcing date order", () => {
    for (const entry of entryFixtures().filter(
      (item) => item.type !== "tender",
    )) {
      expect(
        entrySchema.safeParse({
          ...entry,
          startDate: "2020-01-01",
          endDate: "2020-01-02",
        }).success,
      ).toBe(true);
      expect(
        entrySchema.safeParse({
          ...entry,
          startDate: "2020-01-02",
          endDate: "2020-01-01",
        }).success,
      ).toBe(false);
    }
  });

  it("accepts past tender deadlines while enforcing their order", () => {
    const entry = entryFixtures()[3];
    expect(
      entrySchema.safeParse({
        ...entry,
        preSubmissionDeadline: "2020-01-01",
        callBackDeadline: "2020-01-02",
      }).success,
    ).toBe(true);
    expect(
      entrySchema.safeParse({
        ...entry,
        preSubmissionDeadline: "2020-01-02",
        callBackDeadline: "2020-01-01",
      }).success,
    ).toBe(false);
  });
});
