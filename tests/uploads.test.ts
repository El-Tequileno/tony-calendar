import { afterEach, describe, expect, it, vi } from "vitest";
import { detectFile } from "../src/server/upload-validation";
import {
  fileSelectionError,
  MAX_UPLOAD_BYTES,
  UPLOAD_TYPES,
} from "../src/lib/uploads";
import {
  netlifyUploadsEnabled,
  uploadsEnabled,
} from "../src/server/upload-config";
import { officeFixtures } from "./office-fixtures";
afterEach(() => vi.unstubAllEnvs());
describe("event document validation", () => {
  it("recognizes Office document containers and PDF/text/CSV files", async () => {
    for (const extension of ["docx", "xlsx", "pptx"] as const)
      expect(
        await detectFile(officeFixtures[extension], `event.${extension}`),
      ).toBe(UPLOAD_TYPES[extension]);
    expect(
      await detectFile(
        Buffer.from("%PDF-1.4\nUpload verification\n%%EOF"),
        "event.pdf",
      ),
    ).toBe("application/pdf");
    expect(await detectFile(Buffer.from("Event notes"), "event.txt")).toBe(
      "text/plain",
    );
    expect(
      await detectFile(Buffer.from("name,quantity\nitem,2"), "event.csv"),
    ).toBe("text/csv");
  });
  it("rejects renamed files, binary text, unsupported files and oversize files", async () => {
    await expect(detectFile(officeFixtures.docx, "event.pdf")).rejects.toThrow(
      "does not match",
    );
    await expect(
      detectFile(Buffer.from("MZ executable"), "event.docx"),
    ).rejects.toThrow("does not match");
    await expect(
      detectFile(Buffer.from([0, 1, 2]), "event.txt"),
    ).rejects.toThrow("UTF-8");
    await expect(detectFile(Buffer.from("test"), "event.exe")).rejects.toThrow(
      "Choose",
    );
    await expect(
      detectFile(new Uint8Array(MAX_UPLOAD_BYTES + 1), "event.pdf"),
    ).rejects.toThrow("4 MB");
  });
  it("prevents selecting too many or empty files before saving", () => {
    expect(fileSelectionError([{ name: "event.pdf", size: 123 }], 1)).toBe("");
    expect(fileSelectionError([{ name: "event.pdf", size: 123 }], 0)).toContain(
      "10",
    );
    expect(fileSelectionError([{ name: "event.pdf", size: 0 }], 1)).toContain(
      "non-empty",
    );
  });
});
describe("Netlify runtime upload availability", () => {
  it("recognizes the runtime Blobs context without the build flag", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NETLIFY", "");
    vi.stubEnv("NETLIFY_BLOBS_CONTEXT", "runtime-context");
    expect(netlifyUploadsEnabled()).toBe(true);
    expect(uploadsEnabled()).toBe(true);
    vi.stubEnv("NETLIFY_BLOBS_CONTEXT", "");
    expect(uploadsEnabled()).toBe(false);
    vi.stubEnv("NODE_ENV", "development");
    expect(uploadsEnabled()).toBe(true);
  });
});
