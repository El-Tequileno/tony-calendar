import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { authorizedEmails } from "@/db/schema";
import type { InviteRecipient, Person, Permission } from "@/lib/people";
import { AppError } from "./errors";
function serialize(row: typeof authorizedEmails.$inferSelect): Person {
  return { ...row, createdAt: row.createdAt.toISOString() };
}
export async function findAuthorizedPerson(
  email: string,
): Promise<Person | null> {
  const [row] = await db()
    .select()
    .from(authorizedEmails)
    .where(
      and(eq(authorizedEmails.email, email), eq(authorizedEmails.active, true)),
    );
  return row ? serialize(row) : null;
}
export async function listPeople(): Promise<Person[]> {
  return (
    await db()
      .select()
      .from(authorizedEmails)
      .orderBy(
        desc(authorizedEmails.isTony),
        asc(authorizedEmails.name),
        asc(authorizedEmails.email),
      )
  ).map(serialize);
}
export async function listInviteRecipients(): Promise<InviteRecipient[]> {
  return db()
    .select({ email: authorizedEmails.email, name: authorizedEmails.name })
    .from(authorizedEmails)
    .where(eq(authorizedEmails.active, true))
    .orderBy(asc(authorizedEmails.name), asc(authorizedEmails.email));
}
export async function addPerson(input: {
  email: string;
  name: string;
  permission: Permission;
}): Promise<Person> {
  const [row] = await db()
    .insert(authorizedEmails)
    .values({ ...input, isTony: false, active: true })
    .onConflictDoNothing()
    .returning();
  if (!row)
    throw new AppError(
      "That email already exists. You can restore its access if it was disabled.",
      409,
    );
  return serialize(row);
}
export async function updatePerson(
  email: string,
  changes: { active?: boolean; permission?: Permission },
): Promise<Person> {
  const [row] = await db()
    .update(authorizedEmails)
    .set(changes)
    .where(
      and(
        eq(authorizedEmails.email, email),
        eq(authorizedEmails.isTony, false),
      ),
    )
    .returning();
  if (!row) {
    const [existing] = await db()
      .select({ isTony: authorizedEmails.isTony })
      .from(authorizedEmails)
      .where(eq(authorizedEmails.email, email));
    throw new AppError(
      existing?.isTony
        ? "Tony's access and permission cannot be changed here."
        : "Person not found.",
      existing?.isTony ? 400 : 404,
    );
  }
  return serialize(row);
}
