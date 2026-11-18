import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ currentPerson: vi.fn() }));
vi.mock("@/server/session", () => ({ currentPerson: mocks.currentPerson }));
import {
  protect,
  protectPersonalAction,
  assertCalendarAccess,
} from "../src/server/http";

const request = (origin = "http://localhost:3000") =>
  new Request("http://localhost:3000/api/entries", {
    method: "POST",
    headers: { origin },
  });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_URL", "http://localhost:3000");
});

describe("calendar permissions", () => {
  it("enforces assigned calendars and grants Tony access to all", async () => {
    mocks.currentPerson.mockResolvedValue({
      isTony: false,
      calendars: ["event"],
    });
    await expect(assertCalendarAccess("event")).resolves.toBeUndefined();
    await expect(assertCalendarAccess("market")).rejects.toMatchObject({
      status: 403,
    });
    mocks.currentPerson.mockResolvedValue({ isTony: true, calendars: [] });
    await expect(assertCalendarAccess("market")).resolves.toBeUndefined();
  });
  it("lets read-only people view and acknowledge, but rejects calendar writes", async () => {
    mocks.currentPerson.mockResolvedValue({
      email: "reader@example.com",
      isTony: false,
      permission: "read",
    });
    await expect(protect(request())).resolves.toBe("reader@example.com");
    await expect(protectPersonalAction(request())).resolves.toBe(
      "reader@example.com",
    );
    await expect(protect(request(), true)).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      protectPersonalAction(request("https://other.example.com")),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("allows writers and Tony to change entries", async () => {
    for (const person of [
      { email: "writer@example.com", isTony: false, permission: "write" },
      { email: "tony@example.com", isTony: true, permission: "write" },
    ]) {
      mocks.currentPerson.mockResolvedValue(person);
      await expect(protect(request(), true)).resolves.toBe(person.email);
    }
  });
});
