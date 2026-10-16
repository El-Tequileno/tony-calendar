import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import { eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { authorizedEmails } from "../src/db/schema";
import { personEmailSchema } from "../src/lib/people";
loadEnvConfig(process.cwd());
async function main() {
  const email = personEmailSchema.parse(process.argv[2]);
  await db().transaction(async (tx) => {
    // Only establish an owner once. Changing Tony later is an explicit DB operation.
    const [owner] = await tx
      .select({ email: authorizedEmails.email })
      .from(authorizedEmails)
      .where(eq(authorizedEmails.isTony, true))
      .for("update");
    if (owner && owner.email !== email)
      throw new Error("An owner is already configured.");
    await tx
      .insert(authorizedEmails)
      .values({ email, name: "Tony", isTony: true, active: true })
      .onConflictDoNothing();
    const [person] = await tx
      .select()
      .from(authorizedEmails)
      .where(eq(authorizedEmails.email, email));
    if (person && !person.isTony)
      await tx
        .update(authorizedEmails)
        .set({ isTony: true, active: true, name: person.name || "Tony" })
        .where(eq(authorizedEmails.email, email));
  });
  console.log(
    "Tony's access is configured in Neon. Manage additional people from the app.",
  );
}
main()
  .then(() => process.exit(0))
  .catch(() => {
    console.error(
      "Access setup failed. Provide Tony's exact email and verify database migrations. An existing owner cannot be replaced by this command.",
    );
    process.exitCode = 1;
  });
