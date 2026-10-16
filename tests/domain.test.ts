import { describe, it, expect } from "vitest";
import { sampleEntries } from "../src/db/sample-data";
import { addDays, inRange, occurrences } from "../src/lib/dates";
import { emptyEntry, entrySchema } from "../src/lib/validation";
import { readSession, signSession } from "../src/server/session-token";
describe("calendar dates", () => {
  it("projects exactly two tender dates linked to one record, without filling the days in between", () => {
    const tender = sampleEntries().find((e) => e.type === "tender")!;
    const dates = occurrences([tender]);
    expect(dates).toHaveLength(2);
    expect(dates.map((e) => e.entryId)).toEqual([tender.id, tender.id]);
    expect(dates.map((e) => e.start)).toEqual([
      tender.preSubmissionDeadline,
      tender.callBackDeadline,
    ]);
    expect(inRange(tender, "2026-10-10", "2026-10-11")).toBe(false);
  });
  it("includes visits spanning the entire visible month and handles leap years", () => {
    const visit = {
      ...sampleEntries()[0],
      startDate: "2026-09-20",
      endDate: "2026-11-10",
    };
    expect(inRange(visit, "2026-10-01", "2026-11-01")).toBe(true);
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
});
describe("entry validation", () => {
  it("accepts the four categories and preserves repeated customer groups", () => {
    for (const entry of sampleEntries())
      expect(entrySchema.safeParse(entry).success).toBe(true);
    const market = entrySchema.parse(sampleEntries()[0]);
    expect(market.customers).toHaveLength(2);
    expect(market.customers[1].location).toBe("Example restaurant office");
  });
  it("rejects impossible dates, reversed deadlines, unsafe agenda links and invalid recipient addresses", () => {
    const tender = sampleEntries().find((e) => e.type === "tender")!;
    expect(
      entrySchema.safeParse({ ...tender, preSubmissionDeadline: "2026-02-30" })
        .success,
    ).toBe(false);
    expect(
      entrySchema.safeParse({ ...tender, callBackDeadline: "2026-10-01" })
        .success,
    ).toBe(false);
    expect(
      entrySchema.safeParse({
        ...sampleEntries()[1],
        agenda: "javascript:alert(1)",
      }).success,
    ).toBe(false);
    expect(
      entrySchema.safeParse({ ...sampleEntries()[0], emails: ["invalid"] })
        .success,
    ).toBe(false);
  });
  it("requires a name for every customer and supports an empty optional customer on a Casa Salles visit", () => {
    expect(
      entrySchema.safeParse({
        ...sampleEntries()[0],
        customers: [{ name: "", purpose: "Review", location: "Venue" }],
      }).success,
    ).toBe(false);
    expect(
      entrySchema.safeParse({
        ...emptyEntry("distillery", "2026-10-20"),
        title: "Visit",
      }).success,
    ).toBe(true);
  });
});
describe("email-gate sessions", () => {
  const secret = "a".repeat(40),
    email = "tony@example.com",
    now = 1000000;
  it("accepts a valid signature only while the email remains approved", () => {
    const token = signSession(email, secret, now);
    expect(readSession(token, secret, [email], now)).toBe(email);
    expect(readSession(token, secret, [], now)).toBeNull();
  });
  it("rejects tampered and expired sessions", () => {
    const token = signSession(email, secret, now);
    expect(readSession(`${token}x`, secret, [email], now)).toBeNull();
    expect(readSession(token, secret, [email], now + 8 * 86400000)).toBeNull();
  });
});
