import { addressQuerySchema } from "@/lib/addresses";
import { searchCanadianAddresses } from "@/server/addresses";
import { endpoint, jsonBody, protectPersonalAction } from "@/server/http";
import { consumeLimit } from "@/server/repository";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return endpoint(async () => {
    const email = await protectPersonalAction(request);
    const query = addressQuerySchema.parse(await jsonBody(request));
    await consumeLimit(`address:${email}`, 20, 60000);
    return searchCanadianAddresses(query);
  });
}
