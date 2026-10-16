import { z } from "zod";
import { protect } from "@/server/http";
import { getAttachment } from "@/server/repository";
import { readStoredFile } from "@/server/storage";
import { AppError } from "@/server/errors";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  try {
    await protect(request);
    const ids = z
      .object({ id: z.string().uuid(), fileId: z.string().uuid() })
      .parse(await params);
    const file = await getAttachment(ids.id, ids.fileId);
    const bytes = await readStoredFile(file.key);
    return new Response(bytes, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof AppError
            ? error.message
            : "Certificate unavailable.",
      },
      { status: error instanceof AppError ? error.status : 503 },
    );
  }
}
