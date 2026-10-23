import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../src/server/errors";
const mocks = vi.hoisted(() => ({
  currentPerson: vi.fn(),
  deleteEntry: vi.fn(),
  consumeLimit: vi.fn(),
  deleteStoredFile: vi.fn(),
}));
vi.mock("@/server/session", () => ({
  currentPerson: mocks.currentPerson,
}));
vi.mock("@/server/repository", () => ({
  deleteEntry: mocks.deleteEntry,
  consumeLimit: mocks.consumeLimit,
  saveEntry: vi.fn(),
}));
vi.mock("@/server/storage", () => ({
  deleteStoredFile: mocks.deleteStoredFile,
}));
import { DELETE } from "../src/app/api/entries/[id]/route";
const id = "00000000-0000-4000-8000-000000000001";
const context = { params: Promise.resolve({ id }) };
function request(
  body: unknown = { revision: 2 },
  origin = "http://localhost:3000",
) {
  return new Request(`http://localhost:3000/api/entries/${id}`, {
    method: "DELETE",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_URL", "http://localhost:3000");
  mocks.currentPerson.mockResolvedValue({
    email: "person@example.com",
    isTony: false,
    permission: "write",
  });
  mocks.deleteEntry.mockResolvedValue([]);
});
describe("entry deletion", () => {
  it("requires an active session and the correct origin", async () => {
    mocks.currentPerson.mockResolvedValue(null);
    expect((await DELETE(request(), context)).status).toBe(401);
    mocks.currentPerson.mockResolvedValue({
      email: "person@example.com",
      isTony: false,
      permission: "write",
    });
    expect(
      (await DELETE(request(undefined, "https://other.example.com"), context))
        .status,
    ).toBe(403);
    expect(mocks.deleteEntry).not.toHaveBeenCalled();
  });
  it("blocks read-only people before deleting an entry", async () => {
    mocks.currentPerson.mockResolvedValue({
      email: "person@example.com",
      isTony: false,
      permission: "read",
    });
    expect((await DELETE(request(), context)).status).toBe(403);
    expect(mocks.deleteEntry).not.toHaveBeenCalled();
  });
  it("requires an explicit valid revision and entry ID", async () => {
    for (const body of [{}, { revision: 0 }, { revision: "2" }])
      expect((await DELETE(request(body), context)).status).toBe(400);
    expect(
      (await DELETE(request(), { params: Promise.resolve({ id: "invalid" }) }))
        .status,
    ).toBe(400);
    expect(mocks.deleteEntry).not.toHaveBeenCalled();
  });
  it("deletes for an approved calendar user and cleans related stored certificates", async () => {
    mocks.deleteEntry.mockResolvedValue(["file-one", "file-two"]);
    const response = await DELETE(request(), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id });
    expect(mocks.deleteEntry).toHaveBeenCalledWith(id, 2);
    expect(mocks.deleteStoredFile).toHaveBeenCalledTimes(2);
    expect(mocks.deleteStoredFile).toHaveBeenCalledWith("file-one");
    expect(mocks.deleteStoredFile).toHaveBeenCalledWith("file-two");
  });
  it("preserves the conflict response without deleting files when another person edited the entry", async () => {
    mocks.deleteEntry.mockRejectedValue(
      new AppError("This entry changed.", 409),
    );
    expect((await DELETE(request(), context)).status).toBe(409);
    expect(mocks.deleteStoredFile).not.toHaveBeenCalled();
  });
});
