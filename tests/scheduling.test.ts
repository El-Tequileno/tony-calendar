import { describe, expect, it } from "vitest";
import { calendarToday } from "../src/lib/dates";
import { entrySchema } from "../src/lib/validation";
import { entryFixtures } from "./fixtures";

describe("past-day scheduling", () => {
  it("allows optional times and Saturdays outside event dates while validating provided slots", () => {
    const entry = {
      ...entryFixtures()[2],
      startDate: "2026-10-16",
      endDate: "2026-10-17",
      saturdaySchedules: [
        {
          date: "2026-10-17",
          firstStart: "13:00",
          firstEnd: "16:00",
          secondStart: "19:00",
          secondEnd: "22:00",
        },
      ],
    };
    expect(entrySchema.safeParse(entry).success).toBe(true);
    const schedule = entry.saturdaySchedules[0];
    expect(
      entrySchema.safeParse({
        ...entry,
        saturdaySchedules: [{ ...schedule, date: "2026-10-16" }],
      }).success,
    ).toBe(false);
    expect(
      entrySchema.safeParse({
        ...entry,
        saturdaySchedules: [{ ...schedule, date: "2026-10-24" }],
      }).success,
    ).toBe(true);
    expect(
      entrySchema.safeParse({
        ...entry,
        saturdaySchedules: [{ ...schedule, secondStart: "15:00" }],
      }).success,
    ).toBe(false);
    expect(
      entrySchema.safeParse({
        ...entry,
        saturdaySchedules: [{ ...schedule, secondEnd: "" }],
      }).success,
    ).toBe(true);
    expect(
      entrySchema.safeParse({
        ...entry,
        saturdaySchedules: [schedule, schedule],
      }).success,
    ).toBe(false);
  });
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
