import { getStore } from "@netlify/blobs";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { AppError } from "./errors";
import { netlifyUploadsEnabled } from "./upload-config";
export { uploadsEnabled } from "./upload-config";
export { detectFile } from "./upload-validation";
const directory = () => path.join(process.cwd(), "local-data", "certificates");
export async function storeFile(key: string, bytes: Uint8Array) {
  if (netlifyUploadsEnabled()) {
    await getStore("certificates").set(key, bytes.buffer as ArrayBuffer);
    return;
  }
  if (process.env.NODE_ENV !== "development")
    throw new AppError(
      "Configure document storage before uploading files.",
      503,
    );
  await mkdir(directory(), { recursive: true });
  await writeFile(path.join(directory(), key), bytes);
}
export async function readStoredFile(key: string): Promise<ArrayBuffer> {
  if (netlifyUploadsEnabled()) {
    const data = await getStore("certificates").get(key, {
      type: "arrayBuffer",
    });
    if (!data) throw new AppError("File not found.", 404);
    return data;
  }
  if (process.env.NODE_ENV !== "development")
    throw new AppError("Document storage is unavailable.", 503);
  const buffer = await readFile(path.join(directory(), key));
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}
export async function deleteStoredFile(key: string) {
  if (netlifyUploadsEnabled()) {
    await getStore("certificates").delete(key);
    return;
  }
  if (process.env.NODE_ENV !== "development")
    throw new AppError("Document storage is unavailable.", 503);
  if (!/^[0-9a-f-]{36}$/i.test(key)) throw new Error("Invalid storage key.");
  try {
    await unlink(path.join(directory(), key));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
