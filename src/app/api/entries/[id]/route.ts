import { z } from "zod";
import { protect, endpoint, jsonBody } from "@/server/http";
import { saveEntry, consumeLimit } from "@/server/repository";
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
