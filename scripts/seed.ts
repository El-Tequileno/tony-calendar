import { loadEnvConfig } from "@next/env";
import { sampleEntries } from "../src/db/sample-data";
import { entrySchema } from "../src/lib/validation";
import { insertEntry } from "./insert-entry";
loadEnvConfig(process.cwd());
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("missing configuration");
  let added = 0;
  for (const entry of sampleEntries())
    if (await insertEntry(entry.id, entrySchema.parse(entry))) added++;
  console.log(
    `Inserted ${added} fictional example entries. Existing records were preserved.`,
  );
}
main()
  .then(() => process.exit(0))
  .catch(() => {
    console.error(
      "Seeding failed. Check the database configuration and apply migrations first.",
    );
    process.exitCode = 1;
  });
