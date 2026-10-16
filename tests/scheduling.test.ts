import { describe, expect, it } from "vitest";
import { calendarToday } from "../src/lib/dates";
import { entryWriteSchema } from "../src/lib/validation";
import { entryFixtures } from "./fixtures";
const now = new Date("2026-10-17T03:00:00Z"); // October 16 in Edmonton, already October 17 in UTC.
describe("past-day scheduling", () => {
  it("uses the calendar time zone instead of the server's UTC day, including midnight rollover", () => {
    expect(calendarToday(now)).toBe("2026-10-16");
    expect(calendarToday(new Date("2026-10-17T06:00:00Z"))).toBe("2026-10-17");
  });
  it("allows today and future dates for all visit and event sections", () => {
    for (const entry of entryFixtures().filter(
      (entry) => entry.type !== "tender",
    )) {
      expect(
        entryWriteSchema(undefined, now).safeParse({
          ...entry,
          startDate: "2026-10-16",
          endDate: "2026-10-16",
        }).success,
      ).toBe(true);
      expect(
        entryWriteSchema(undefined, now).safeParse({
          ...entry,
          startDate: "2026-10-17",
          endDate: "2026-10-19",
        }).success,
      ).toBe(true);
      const result = entryWriteSchema(undefined, now).safeParse({
        ...entry,
        startDate: "2026-10-15",
        endDate: "2026-10-17",
      });
      expect(result.success).toBe(false);
      if (!result.success)
        expect(
          result.error.issues.some((issue) => issue.path[0] === "startDate"),
        ).toBe(true);
    }
  });
  it("checks both tender deadlines and permits today's deadlines", () => {
    const entry = entryFixtures()[3];
    expect(
      entryWriteSchema(undefined, now).safeParse({
        ...entry,
        preSubmissionDeadline: "2026-10-16",
        callBackDeadline: "2026-10-16",
      }).success,
    ).toBe(true);
    const result = entryWriteSchema(undefined, now).safeParse({
      ...entry,
      preSubmissionDeadline: "2026-10-14",
      callBackDeadline: "2026-10-15",
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues.map((issue) => issue.path[0])).toEqual([
        "preSubmissionDeadline",
        "callBackDeadline",
      ]);
  });
  it("permits unchanged historical dates but blocks moving them to another past day or changing section to bypass the rule", () => {
    const previous = {
      ...entryFixtures()[0],
      startDate: "2026-10-10",
      endDate: "2026-10-12",
    };
    expect(
      entryWriteSchema(previous, now).safeParse({
        ...previous,
        title: "Corrected details",
      }).success,
    ).toBe(true);
    expect(
      entryWriteSchema(previous, now).safeParse({
        ...previous,
        startDate: "2026-10-11",
      }).success,
    ).toBe(false);
    expect(
      entryWriteSchema(previous, now).safeParse({
        ...previous,
        endDate: "2026-10-13",
      }).success,
    ).toBe(false);
    expect(
      entryWriteSchema(previous, now).safeParse({ ...previous, type: "event" })
        .success,
    ).toBe(false);
    expect(
      entryWriteSchema(previous, now).safeParse({
        ...previous,
        startDate: "2026-10-16",
        endDate: "2026-10-17",
      }).success,
    ).toBe(true);
  });
});
