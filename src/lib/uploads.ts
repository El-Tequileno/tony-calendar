export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_ATTACHMENTS = 10;
export const UPLOAD_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  csv: "text/csv",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};
export const UPLOAD_ACCEPT = Object.keys(UPLOAD_TYPES)
  .map((extension) => `.${extension}`)
  .join(",");
export const UPLOAD_FORMATS =
  "PDF, DOCX, XLSX, PPTX, TXT, CSV, JPG, PNG or WebP";
export function fileSelectionError(
  files: Pick<File, "name" | "size">[],
  remaining: number,
) {
  if (files.length > remaining)
    return `You can attach up to ${MAX_ATTACHMENTS} files per event.`;
  for (const file of files) {
    if (!UPLOAD_TYPES[file.name.split(".").pop()?.toLowerCase() || ""])
      return `Unsupported file: ${file.name}. Choose ${UPLOAD_FORMATS}.`;
    if (!file.size || file.size > MAX_UPLOAD_BYTES)
      return `${file.name} must be non-empty and no larger than 4 MB.`;
  }
  return "";
}
