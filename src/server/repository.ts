import { randomUUID } from "node:crypto";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "../db/client";
import * as tables from "../db/schema";
import {
  entryWriteSchema,
  type Attachment,
  type Entry,
  type EntryInput,
} from "../lib/validation";
import { AppError } from "./errors";

export async function listEntries(): Promise<Entry[]> {
  const [rows, customers, requirements, acks, files] = await Promise.all([
    db().select().from(tables.entries).orderBy(desc(tables.entries.updatedAt)),
    db()
      .select()
      .from(tables.customerMeetings)
      .orderBy(tables.customerMeetings.position),
    db()
      .select()
      .from(tables.tenderRequirements)
      .orderBy(tables.tenderRequirements.position),
    db().select().from(tables.acknowledgments),
    db().select().from(tables.attachments),
  ]);
  return rows.map((row) => ({
    ...row.data,
    venueName: row.data.venueName || "",
    address:
      row.data.address ?? (row.type === "event" ? row.data.location || "" : ""),
    postalCode: row.data.postalCode || "",
    specialNotes: row.data.specialNotes || "",
    type: row.type,
    id: row.id,
    revision: row.revision,
    updatedAt: row.updatedAt.toISOString(),
    customers: customers
      .filter((c) => c.entryId === row.id)
      .map(({ name, purpose, location }) => ({ name, purpose, location })),
    requirements: requirements
      .filter((r) => r.entryId === row.id)
      .map(({ priority, specification }) => ({ priority, specification })),
    acknowledgments: acks
      .filter((a) => a.entryId === row.id)
      .map((a) => a.email),
    attachments: files
      .filter((f) => f.entryId === row.id)
      .map(({ id, name, contentType, size }) => ({
        id,
        name,
        contentType,
        size,
      })),
  }));
}
export async function getEntry(id: string) {
  const entry = (await listEntries()).find((e) => e.id === id);
  if (!entry) throw new AppError("Entry not found.", 404);
  return entry;
}
export async function saveEntry(
  data: EntryInput,
  id?: string,
  revision?: number,
): Promise<Entry> {
  if (!id) data = entryWriteSchema().parse(data);
  const entryId = id || randomUUID();
  const { customers, requirements, ...payload } = data;
  await db().transaction(async (tx) => {
    if (id) {
      if (!revision) throw new AppError("An entry revision is required.", 400);
      const [previous] = await tx
        .select()
        .from(tables.entries)
        .where(eq(tables.entries.id, id))
        .for("update");
      if (!previous || previous.revision !== revision)
        throw new AppError(
          "This entry changed or was removed. Reload it before saving again.",
          409,
        );
      entryWriteSchema({ ...previous.data, type: previous.type }).parse(data);
      const updated = await tx
        .update(tables.entries)
        .set({
          type: data.type,
          data: payload,
          revision: revision + 1,
          updatedAt: new Date(),
        })
        .where(
          and(eq(tables.entries.id, id), eq(tables.entries.revision, revision)),
        )
        .returning({ id: tables.entries.id });
      if (!updated.length)
        throw new AppError(
          "This entry changed or was removed. Reload it before saving again.",
          409,
        );
      await tx
        .delete(tables.customerMeetings)
        .where(eq(tables.customerMeetings.entryId, id));
      await tx
        .delete(tables.tenderRequirements)
        .where(eq(tables.tenderRequirements.entryId, id));
    } else
      await tx
        .insert(tables.entries)
        .values({ id: entryId, type: data.type, data: payload });
    if (data.type === "market" && customers.length)
      await tx
        .insert(tables.customerMeetings)
        .values(customers.map((c, position) => ({ ...c, position, entryId })));
    if (data.type === "tender" && requirements.length)
      await tx
        .insert(tables.tenderRequirements)
        .values(
          requirements.map((r, position) => ({ ...r, position, entryId })),
        );
  });
  return getEntry(entryId);
}
export async function acknowledge(id: string, email: string, checked: boolean) {
  await getEntry(id);
  if (checked)
    await db()
      .insert(tables.acknowledgments)
      .values({ entryId: id, email })
      .onConflictDoNothing();
  else
    await db()
      .delete(tables.acknowledgments)
      .where(
        and(
          eq(tables.acknowledgments.entryId, id),
          eq(tables.acknowledgments.email, email),
        ),
      );
  return getEntry(id);
}
export async function deleteEntry(id: string, revision: number) {
  return db().transaction(async (tx) => {
    const [entry] = await tx
      .select({ revision: tables.entries.revision })
      .from(tables.entries)
      .where(eq(tables.entries.id, id))
      .for("update");
    if (!entry) throw new AppError("Entry not found.", 404);
    if (entry.revision !== revision)
      throw new AppError("This entry changed. Reload it before deleting.", 409);
    const files = await tx
      .select({ key: tables.attachments.key })
      .from(tables.attachments)
      .where(eq(tables.attachments.entryId, id));
    // Foreign keys remove customer meetings, tender requirements, acknowledgments,
    // attachment metadata and invitation records in the same transaction.
    await tx.delete(tables.entries).where(eq(tables.entries.id, id));
    return files.map((file) => file.key);
  });
}
export async function consumeLimit(key: string, max: number, windowMs: number) {
  const now = new Date(),
    expires = new Date(Date.now() + windowMs);
  const [record] = await db()
    .insert(tables.rateLimits)
    .values({ key, hits: 1, expiresAt: expires })
    .onConflictDoUpdate({
      target: tables.rateLimits.key,
      set: {
        hits: sql`case when ${tables.rateLimits.expiresAt} <= ${now} then 1 else ${tables.rateLimits.hits} + 1 end`,
        expiresAt: sql`case when ${tables.rateLimits.expiresAt} <= ${now} then ${expires} else ${tables.rateLimits.expiresAt} end`,
      },
    })
    .returning();
  if (record.hits > max)
    throw new AppError("Too many requests. Please try again later.", 429);
}
export async function beginInvitation(entryId: string, email: string) {
  return db().transaction(async (tx) => {
    await tx
      .select({ id: tables.entries.id })
      .from(tables.entries)
      .where(eq(tables.entries.id, entryId))
      .for("update");
    const recent = await tx
      .select()
      .from(tables.invitations)
      .where(
        and(
          eq(tables.invitations.entryId, entryId),
          gt(tables.invitations.createdAt, new Date(Date.now() - 60000)),
        ),
      );
    if (recent.length)
      throw new AppError(
        "Invitations were requested recently. Wait one minute before sending again.",
        429,
      );
    const [row] = await tx
      .insert(tables.invitations)
      .values({ entryId, requestedBy: email, status: "pending" })
      .returning();
    return row.id;
  });
}
export async function finishInvitation(
  id: string,
  status: string,
  providerId?: string,
) {
  await db()
    .update(tables.invitations)
    .set({ status, providerId })
    .where(eq(tables.invitations.id, id));
}
export async function addAttachment(
  entryId: string,
  file: Attachment,
  key: string,
) {
  await db()
    .insert(tables.attachments)
    .values({ ...file, entryId, key });
  return getEntry(entryId);
}
export async function getAttachment(entryId: string, id: string) {
  const [file] = await db()
    .select()
    .from(tables.attachments)
    .where(
      and(
        eq(tables.attachments.id, id),
        eq(tables.attachments.entryId, entryId),
      ),
    );
  if (!file) throw new AppError("Attachment not found.", 404);
  return file;
}
