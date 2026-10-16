import { protect, endpoint, jsonBody } from "@/server/http";
import { listEntries, saveEntry, consumeLimit } from "@/server/repository";
import { saveEntrySchema } from "@/lib/validation";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return endpoint(async () => {
    await protect(request);
    return { entries: await listEntries() };
  });
}
export async function POST(request: Request) {
  return endpoint(async () => {
    const email = await protect(request, true);
    await consumeLimit(`write:${email}`, 120, 60000);
    const { data } = saveEntrySchema.parse(await jsonBody(request));
    return { entry: await saveEntry(data) };
  });
}
