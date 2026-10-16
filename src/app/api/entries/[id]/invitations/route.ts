import { z } from "zod";
import { protect, endpoint } from "@/server/http";
import { getEntry, consumeLimit } from "@/server/repository";
import { sendInvitations } from "@/server/email";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const email = await protect(request, true);
    const id = z
      .string()
      .uuid()
      .parse((await params).id);
    await consumeLimit(`email:${email}`, 5, 60 * 60 * 1000);
    return sendInvitations(await getEntry(id), email);
  });
}
