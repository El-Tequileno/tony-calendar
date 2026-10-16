import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addPersonSchema,
  updatePersonSchema,
  type Person,
} from "../src/lib/people";

const mocks = vi.hoisted(() => ({
  currentPerson: vi.fn(),
  listPeople: vi.fn(),
  addPerson: vi.fn(),
  updatePerson: vi.fn(),
  consumeLimit: vi.fn(),
}));
vi.mock("@/server/session", () => ({
  currentPerson: mocks.currentPerson,
  currentEmail: vi.fn(),
}));
vi.mock("@/server/people", () => ({
  listPeople: mocks.listPeople,
  addPerson: mocks.addPerson,
  updatePerson: mocks.updatePerson,
}));
vi.mock("@/server/repository", () => ({ consumeLimit: mocks.consumeLimit }));
import { GET, POST, PATCH } from "../src/app/api/people/route";

const person: Person = {
  email: "person@example.com",
  name: "Person",
  active: true,
  isTony: false,
  createdAt: new Date(0).toISOString(),
};
function request(
  method = "GET",
  body?: unknown,
  origin = "http://localhost:3000",
) {
  return new Request("http://localhost:3000/api/people", {
    method,
    headers: { origin, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("APP_URL", "http://localhost:3000");
});
describe("People authorization", () => {
  it("rejects unauthenticated requests for every operation", async () => {
    mocks.currentPerson.mockResolvedValue(null);
    expect((await GET(request())).status).toBe(401);
    expect((await POST(request("POST", { email: person.email }))).status).toBe(
      401,
    );
    expect(
      (await PATCH(request("PATCH", { email: person.email, active: false })))
        .status,
    ).toBe(401);
    expect(mocks.listPeople).not.toHaveBeenCalled();
    expect(mocks.addPerson).not.toHaveBeenCalled();
    expect(mocks.updatePerson).not.toHaveBeenCalled();
  });
  it("rejects a distributor even when they submit a forged Tony permission", async () => {
    mocks.currentPerson.mockResolvedValue(person);
    expect((await GET(request())).status).toBe(403);
    expect(
      (await POST(request("POST", { email: person.email, isTony: true })))
        .status,
    ).toBe(403);
    expect(
      (await PATCH(request("PATCH", { email: person.email, active: false })))
        .status,
    ).toBe(403);
    expect(mocks.addPerson).not.toHaveBeenCalled();
    expect(mocks.updatePerson).not.toHaveBeenCalled();
  });
  it("allows Tony to manage people and enforces origin checks", async () => {
    mocks.currentPerson.mockResolvedValue({ ...person, isTony: true });
    mocks.listPeople.mockResolvedValue([person]);
    mocks.addPerson.mockResolvedValue(person);
    mocks.updatePerson.mockResolvedValue({ ...person, active: false });
    expect((await GET(request())).status).toBe(200);
    expect(
      (
        await POST(
          request("POST", { email: " PERSON@example.com ", name: "Person" }),
        )
      ).status,
    ).toBe(200);
    expect(mocks.addPerson).toHaveBeenCalledWith({
      email: person.email,
      name: "Person",
    });
    expect(
      (await PATCH(request("PATCH", { email: person.email, active: false })))
        .status,
    ).toBe(200);
    expect(
      (
        await POST(
          request("POST", { email: person.email }, "https://other.example.com"),
        )
      ).status,
    ).toBe(403);
    expect(
      (await POST(request("POST", { email: person.email, isTony: true })))
        .status,
    ).toBe(400);
  });
});
describe("People validation", () => {
  it("normalizes addresses and prevents changing owner permission through forms", () => {
    expect(addPersonSchema.parse({ email: " PERSON@Example.com " })).toEqual({
      email: person.email,
      name: "",
    });
    expect(
      addPersonSchema.safeParse({ email: person.email, isTony: true }).success,
    ).toBe(false);
    expect(
      updatePersonSchema.safeParse({
        email: person.email,
        active: true,
        isTony: true,
      }).success,
    ).toBe(false);
    expect(
      updatePersonSchema.safeParse({ email: person.email, active: "false" })
        .success,
    ).toBe(false);
  });
});
