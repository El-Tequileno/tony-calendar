import { randomUUID } from "node:crypto";
import { z } from "zod";
import { protect, endpoint } from "@/server/http";
import { getEntry, consumeLimit, addAttachment } from "@/server/repository";
import { demoMode } from "@/server/config";
import { storeFile, detectFile } from "@/server/storage";
import { AppError } from "@/server/errors";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const email = await protect(request, true);
    await consumeLimit(`upload:${email}`, 20, 60 * 60 * 1000);
    if (demoMode())
      throw new AppError(
        "Certificate uploads require the Neon database. Demo mode does not store files.",
        503,
      );
    const id = z
      .string()
      .uuid()
      .parse((await params).id);
    const entry = await getEntry(id);
    if (entry.type !== "event")
      throw new AppError("Certificates belong to Events in Canada.");
    if (entry.attachments.length >= 10)
      throw new AppError("This event already has ten attachments.");
    const length = Number(request.headers.get("content-length"));
    if (!Number.isFinite(length) || length > 4 * 1024 * 1024 + 65536)
      throw new AppError("Choose a certificate under 4 MB.", 413);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > 4 * 1024 * 1024)
      throw new AppError("Choose a certificate under 4 MB.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const contentType = detectFile(bytes);
    const fileId = randomUUID();
    await storeFile(fileId, bytes);
    return {
      entry: await addAttachment(
        id,
        {
          id: fileId,
          name: pathSafeName(file.name),
          contentType,
          size: file.size,
        },
        fileId,
      ),
    };
  });
}
function pathSafeName(name: string) {
  return (
    name.replace(/[\\/\r\n\x00-\x1f]/g, "_").slice(0, 180) || "certificate"
  );
}
