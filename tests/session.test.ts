import { beforeEach, describe, expect, it, vi } from "vitest";
import { signSession } from "../src/server/session-token";
const mocks = vi.hoisted(() => ({
  cookie: vi.fn(),
  findAuthorizedPerson: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mocks.cookie }),
}));
vi.mock("@/server/people", () => ({
  findAuthorizedPerson: mocks.findAuthorizedPerson,
}));
import { currentPerson } from "../src/server/session";
const secret = "s".repeat(48);
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SESSION_SECRET", secret);
});
describe("database-backed sessions", () => {
  it("rechecks database access on every request, including existing signed cookies", async () => {
    mocks.cookie.mockReturnValue({
      value: signSession("person@example.com", secret),
    });
    const person = { email: "person@example.com", isTony: false, active: true };
    mocks.findAuthorizedPerson
      .mockResolvedValueOnce(person)
      .mockResolvedValueOnce(null);
    expect(await currentPerson()).toEqual(person);
    expect(await currentPerson()).toBeNull();
    expect(mocks.findAuthorizedPerson).toHaveBeenCalledTimes(2);
  });
  it("does not trust an unsigned or absent cookie", async () => {
    mocks.cookie
      .mockReturnValueOnce({ value: "forged" })
      .mockReturnValueOnce(undefined);
    expect(await currentPerson()).toBeNull();
    expect(await currentPerson()).toBeNull();
    expect(mocks.findAuthorizedPerson).not.toHaveBeenCalled();
  });
});
