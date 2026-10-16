import { emptyEntry, type Entry } from "../src/lib/validation";

// Test inputs only: these are never imported by the application or inserted by setup.
export function entryFixtures(): Entry[] {
  return (["market", "distillery", "event", "tender"] as const).map(
    (type, index) => ({
      ...emptyEntry(type, "2026-10-20"),
      id: `00000000-0000-4000-8000-00000000000${index + 1}`,
      title: `Test ${type}`,
      revision: 1,
      updatedAt: "2026-10-01T00:00:00.000Z",
      acknowledgments: [],
      attachments: [],
      customers:
        type === "market"
          ? [
              {
                name: "First customer",
                purpose: "Meeting",
                location: "First venue",
              },
              {
                name: "Second customer",
                purpose: "Review",
                location: "Second venue",
              },
            ]
          : [],
      destination: type === "tender" ? "Test destination" : "",
      preSubmissionDeadline: "2026-10-05",
      callBackDeadline: "2026-10-20",
      requirements:
        type === "tender"
          ? [{ priority: 1, specification: "Test requirement" }]
          : [],
    }),
  );
}
