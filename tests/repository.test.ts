import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  acknowledge,
  getEntry,
  listEntries,
  saveEntry,
} from "../src/server/repository";
import { entrySchema } from "../src/lib/validation";
beforeEach(() => {
  vi.stubEnv("DEMO_MODE", "true");
});
describe("shared entry edits", () => {
  it("preserves acknowledgments through edits and rejects a stale editor", async () => {
    const initial = (await listEntries()).find((e) => e.type === "market")!;
    const payload = entrySchema.parse(initial);
    const created = await saveEntry({ ...payload, title: "Concurrency test" });
    await acknowledge(created.id, "distributor@example.com", true);
    const updated = await saveEntry(
      { ...payload, title: "Updated title" },
      created.id,
      created.revision,
    );
    expect(updated.acknowledgments).toContain("distributor@example.com");
    await expect(
      saveEntry(
        { ...payload, title: "Stale title" },
        created.id,
        created.revision,
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect((await getEntry(created.id)).title).toBe("Updated title");
  });
});
