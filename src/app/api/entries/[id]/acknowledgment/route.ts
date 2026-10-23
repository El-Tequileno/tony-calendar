import { z } from "zod";
import { protectPersonalAction, endpoint, jsonBody } from "@/server/http";
import { acknowledge, consumeLimit } from "@/server/repository";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const email = await protectPersonalAction(request);
    await consumeLimit(`write:${email}`, 120, 60000);
    const id = z
      .string()
      .uuid()
      .parse((await params).id);
    const { checked } = z
      .object({ checked: z.boolean() })
      .parse(await jsonBody(request));
    return { entry: await acknowledge(id, email, checked) };
  });
}
