import { getStore } from "@netlify/blobs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { AppError } from "./errors";
export function uploadsEnabled() {
  return !!process.env.NETLIFY || process.env.NODE_ENV === "development";
}
const directory = () => path.join(process.cwd(), "local-data", "certificates");
export async function storeFile(key: string, bytes: Uint8Array) {
  if (process.env.NETLIFY) {
    await getStore("certificates").set(key, bytes.buffer as ArrayBuffer);
    return;
  }
  if (process.env.NODE_ENV !== "development")
    throw new AppError(
      "Configure certificate storage before uploading files.",
      503,
    );
  await mkdir(directory(), { recursive: true });
  await writeFile(path.join(directory(), key), bytes);
}
export async function readStoredFile(key: string): Promise<ArrayBuffer> {
  if (process.env.NETLIFY) {
    const data = await getStore("certificates").get(key, {
      type: "arrayBuffer",
    });
    if (!data) throw new AppError("File not found.", 404);
    return data;
  }
  if (process.env.NODE_ENV !== "development")
    throw new AppError("Certificate storage is unavailable.", 503);
  const buffer = await readFile(path.join(directory(), key));
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}
export function detectFile(bytes: Uint8Array) {
  if (Buffer.from(bytes.slice(0, 5)).toString() === "%PDF-")
    return "application/pdf";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  if (
    Buffer.from(bytes.slice(0, 8)).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    )
  )
    return "image/png";
  if (
    Buffer.from(bytes.slice(0, 4)).toString() === "RIFF" &&
    Buffer.from(bytes.slice(8, 12)).toString() === "WEBP"
  )
    return "image/webp";
  throw new AppError("Choose a PDF, JPEG, PNG, or WebP certificate.");
}
