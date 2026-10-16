import assert from "node:assert/strict";
import { entrySchema, emptyEntry, type Entry } from "../src/lib/validation";
const origin = process.env.TEST_BASE_URL || "http://localhost:3000";
let cookie = "";
async function request(
  path: string,
  method = "GET",
  body?: unknown,
  extraHeaders: Record<string, string> = {},
) {
  const response = await fetch(origin + path, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...extraHeaders,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { response, data: await response.json() };
}
async function main() {
  assert.equal(
    (await request("/api/entries")).response.status,
    401,
    "Entry data must require a session",
  );
  assert.equal(
    (
      await request(
        "/api/session",
        "POST",
        { email: "tony@example.com" },
        { Origin: "https://other.example.com" },
      )
    ).response.status,
    403,
    "Cross-origin writes must be rejected",
  );
  assert.equal(
    (
      await request("/api/session", "POST", {
        email: "not-approved@example.com",
      })
    ).response.status,
    403,
    "Unapproved email must be rejected",
  );
  const login = await request("/api/session", "POST", {
    email: "tony@example.com",
  });
  assert.equal(login.response.status, 200);
  assert.equal(
    login.data.demo,
    true,
    "Run this script against an isolated demo server only",
  );
  cookie = login.response.headers.get("set-cookie")!.split(";")[0];
  const input = entrySchema.parse({
    ...emptyEntry("market", "2026-10-20"),
    title: "HTTP smoke test",
    customers: [
      { name: "Test customer A", purpose: "Review", location: "Venue A" },
      { name: "Test customer B", purpose: "Introduction", location: "Venue B" },
    ],
  });
  const created = await request("/api/entries", "POST", { data: input });
  assert.equal(created.response.status, 200);
  const entry = created.data.entry as Entry;
  assert.equal(entry.customers.length, 2);
  assert.equal(
    (
      await request(`/api/entries/${entry.id}/acknowledgment`, "POST", {
        checked: true,
      })
    ).response.status,
    200,
  );
  const updated = await request(`/api/entries/${entry.id}`, "PUT", {
    data: { ...input, title: "Updated HTTP smoke test" },
    revision: entry.revision,
  });
  assert.equal(updated.response.status, 200);
  assert.ok(updated.data.entry.acknowledgments.includes("tony@example.com"));
  const stale = await request(`/api/entries/${entry.id}`, "PUT", {
    data: input,
    revision: entry.revision,
  });
  assert.equal(stale.response.status, 409);
  const invalid = await request("/api/entries", "POST", {
    data: { ...input, endDate: "2026-10-01" },
  });
  assert.equal(invalid.response.status, 400);
  assert.equal(
    (await request(`/api/entries/${entry.id}/invitations`, "POST", {})).response
      .status,
    503,
    "Demo must not send real email",
  );
  const fetched = await request("/api/entries");
  assert.ok(
    fetched.data.entries.some(
      (e: Entry) => e.id === entry.id && e.title === "Updated HTTP smoke test",
    ),
  );
  assert.equal((await request("/api/session", "DELETE")).response.status, 200);
  cookie = "";
  assert.equal(
    (await request("/api/entries")).response.status,
    401,
    "Signed-out cookie must be removed by the client",
  );
  console.log(
    "HTTP smoke checks passed: access gate, origin check, validation, save, acknowledgment, stale edit protection, fetch, email configuration, logout.",
  );
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "HTTP smoke checks failed.",
  );
  process.exitCode = 1;
});
