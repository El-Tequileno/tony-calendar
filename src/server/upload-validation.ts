import { fileTypeFromBuffer } from "file-type";
import { MAX_UPLOAD_BYTES, UPLOAD_TYPES, UPLOAD_FORMATS } from "@/lib/uploads";
import { AppError } from "./errors";
export async function detectFile(bytes: Uint8Array, name: string) {
  if (!bytes.length || bytes.length > MAX_UPLOAD_BYTES)
    throw new AppError("Choose a non-empty file no larger than 4 MB.", 413);
  const extension = name.split(".").pop()?.toLowerCase() || "";
  const expected = UPLOAD_TYPES[extension];
  if (!expected) throw new AppError(`Choose ${UPLOAD_FORMATS}.`);
  if (extension === "txt" || extension === "csv") {
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (text.includes("\u0000")) throw new Error("Binary content.");
      return expected;
    } catch {
      throw new AppError("TXT and CSV uploads must contain UTF-8 text.");
    }
  }
  try {
    const detected = await fileTypeFromBuffer(bytes, {
      maxBufferSize: MAX_UPLOAD_BYTES,
      signal: AbortSignal.timeout(3000),
    });
    if (detected?.mime === expected) return expected;
  } catch {
    /* Malformed or unsupported binary files are rejected below. */
  }
  throw new AppError(
    "The file content does not match its extension. Choose a valid supported document or image.",
  );
}
