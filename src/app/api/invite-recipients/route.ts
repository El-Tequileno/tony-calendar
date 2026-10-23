import { endpoint, protect } from "@/server/http";
import { listInviteRecipients } from "@/server/people";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return endpoint(async () => {
    await protect(request);
    return { recipients: await listInviteRecipients() };
  });
}
