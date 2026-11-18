import {
  protect,
  endpoint,
  jsonBody,
  assertCalendarAccess,
} from "@/server/http";
import { currentPerson } from "@/server/session";
import { listEntries, saveEntry, consumeLimit } from "@/server/repository";
import { saveEntrySchema } from "@/lib/validation";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return endpoint(async () => {
    await protect(request);
    const person = await currentPerson();
    return {
      entries: (await listEntries()).filter(
        (entry) =>
          person && (person.isTony || person.calendars.includes(entry.type)),
      ),
    };
  });
}
export async function POST(request: Request) {
  return endpoint(async () => {
    const email = await protect(request, true);
    await consumeLimit(`write:${email}`, 120, 60000);
    const { data } = saveEntrySchema.parse(await jsonBody(request));
    await assertCalendarAccess(data.type);
    return { entry: await saveEntry(data) };
  });
}
