import { db } from "../src/db/client";
import * as tables from "../src/db/schema";
import type { EntryInput } from "../src/lib/validation";
export async function insertEntry(id: string, input: EntryInput) {
  const { customers, requirements, ...data } = input;
  return db().transaction(async (tx) => {
    const inserted = await tx
      .insert(tables.entries)
      .values({ id, type: data.type, data })
      .onConflictDoNothing()
      .returning({ id: tables.entries.id });
    if (!inserted.length) return false;
    if (data.type === "market" && customers.length)
      await tx
        .insert(tables.customerMeetings)
        .values(
          customers.map((c, position) => ({ ...c, entryId: id, position })),
        );
    if (data.type === "tender" && requirements.length)
      await tx
        .insert(tables.tenderRequirements)
        .values(
          requirements.map((r, position) => ({ ...r, entryId: id, position })),
        );
    return true;
  });
}
