import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentPerson: vi.fn(),
  listInviteRecipients: vi.fn(),
}));

vi.mock("@/server/session", () => ({ currentPerson: mocks.currentPerson }));
vi.mock("@/server/people", () => ({
  listInviteRecipients: mocks.listInviteRecipients,
}));

import { GET } from "../src/app/api/invite-recipients/route";

const request = () =>
  new Request("http://localhost:3000/api/invite-recipients");

beforeEach(() => vi.clearAllMocks());

describe("Invitation recipient options", () => {
  it("requires an authorized calendar session", async () => {
    mocks.currentPerson.mockResolvedValue(null);
    expect((await GET(request())).status).toBe(401);
    expect(mocks.listInviteRecipients).not.toHaveBeenCalled();
  });

  it("returns approved email options to an authorized person", async () => {
    mocks.currentPerson.mockResolvedValue({
      email: "viewer@example.com",
      permission: "read",
      isTony: false,
    });
    mocks.listInviteRecipients.mockResolvedValue([
      { email: "tony@example.com", name: "Tony" },
    ]);
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      recipients: [{ email: "tony@example.com", name: "Tony" }],
    });
  });
});
