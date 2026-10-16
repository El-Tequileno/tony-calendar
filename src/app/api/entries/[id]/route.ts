import { z } from "zod";
import { protect, endpoint, jsonBody } from "@/server/http";
import { saveEntry, deleteEntry, consumeLimit } from "@/server/repository";
import { deleteStoredFile } from "@/server/storage";
import { saveEntrySchema } from "@/lib/validation";
export const runtime = "nodejs";
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const email = await protect(request, true);
    await consumeLimit(`write:${email}`, 120, 60000);
    const id = z
      .string()
      .uuid()
      .parse((await params).id);
    const { data, revision } = saveEntrySchema.parse(await jsonBody(request));
    return { entry: await saveEntry(data, id, revision) };
  });
}
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const email = await protect(request, true);
    await consumeLimit(`write:${email}`, 120, 60000);
    const id = z
      .string()
      .uuid()
      .parse((await params).id);
    const { revision } = z
      .object({ revision: z.number().int().min(1) })
      .strict()
      .parse(await jsonBody(request));
    const keys = await deleteEntry(id, revision);
    const cleanup = await Promise.allSettled(
      keys.map((key) => deleteStoredFile(key)),
    );
    if (cleanup.some((result) => result.status === "rejected"))
      console.error("Entry deleted, but certificate storage cleanup failed.");
    return { id };
  });
}
