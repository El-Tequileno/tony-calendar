import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { z } from "zod";
import { emptyEntry, entrySchema } from "../src/lib/validation";
import { insertEntry } from "./insert-entry";
loadEnvConfig(process.cwd());
const legacySchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    destination: z.string(),
    priceRange: z.string(),
    preSubmissionDeadline: z.string(),
    callBackDeadline: z.string(),
    requirements: z.array(
      z.object({ priority: z.coerce.number(), specification: z.string() }),
    ),
  }),
);
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("missing configuration");
  const source = await readFile(process.argv[2] || "./tender-data.js", "utf8");
  // Parse the JSON array only; never execute the local JavaScript file.
  const records = legacySchema.parse(
    JSON.parse(source.slice(source.indexOf("["), source.lastIndexOf("]") + 1)),
  );
  let added = 0;
  for (const record of records) {
    const hash = createHash("sha256")
      .update(`tony-calendar-tender-import:${record.id}`)
      .digest("hex");
    const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
    const data = entrySchema.parse({
      ...emptyEntry("tender", record.preSubmissionDeadline),
      ...record,
      provinces: [],
    });
    if (await insertEntry(id, data)) added++;
  }
  console.log(
    `Imported ${added} tender calls. Existing records were preserved. Source data was not written to the repository.`,
  );
}
main()
  .then(() => process.exit(0))
  .catch(() => {
    console.error(
      "Import failed. Verify the local tender source, DATABASE_URL, and database migrations.",
    );
    process.exitCode = 1;
  });
