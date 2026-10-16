"use client";
import { useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Attachment } from "@/lib/validation";
import {
  MAX_ATTACHMENTS,
  UPLOAD_ACCEPT,
  UPLOAD_FORMATS,
  fileSelectionError,
} from "@/lib/uploads";
export function DocumentPicker({
  files,
  existing,
  entryId,
  disabled,
  available,
  onChange,
}: {
  files: File[];
  existing: Attachment[];
  entryId?: string;
  disabled: boolean;
  available: boolean;
  onChange: (files: File[]) => void;
}) {
  const [error, setError] = useState("");
  return (
    <section className="form-section">
      <h3>Documents & alcohol certificates</h3>
      <p className="field-hint">
        Attach event documents, serving-alcohol certificates, or supporting
        photos. Files upload when you save the event.
      </p>
      {!!existing.length && (
        <div className="attachments">
          {existing.map((file) => (
            <a
              key={file.id}
              href={`/api/entries/${entryId}/attachments/${file.id}`}
            >
              <FileText size={16} />
              <span>
                {file.name}
                <small>{Math.ceil(file.size / 1024)} KB</small>
              </span>
              Download
            </a>
          ))}
        </div>
      )}
      {!!files.length && (
        <ul className="pending-files">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${file.lastModified}`}>
              <FileText size={17} />
              <span>
                {file.name}
                <small>
                  {Math.ceil(file.size / 1024)} KB · Ready to upload
                </small>
              </span>
              <Button
                variant="icon"
                disabled={disabled}
                aria-label={`Remove pending file ${file.name}`}
                onClick={() => {
                  onChange(files.filter((_, i) => i !== index));
                  setError("");
                }}
              >
                <X size={14} />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <label className={`upload-zone ${!available ? "disabled" : ""}`}>
        <Upload size={18} />
        <span>
          Choose documents or photos
          <small>
            {UPLOAD_FORMATS} · 4 MB each · {MAX_ATTACHMENTS} files per event
          </small>
        </span>
        <input
          aria-label="Attach event documents"
          type="file"
          multiple
          accept={UPLOAD_ACCEPT}
          disabled={
            disabled ||
            !available ||
            files.length + existing.length >= MAX_ATTACHMENTS
          }
          onChange={(event) => {
            const picked = Array.from(event.target.files || []);
            event.target.value = "";
            const unique = picked.filter(
              (file) =>
                !files.some(
                  (old) =>
                    old.name === file.name &&
                    old.size === file.size &&
                    old.lastModified === file.lastModified,
                ),
            );
            const message = fileSelectionError(
              unique,
              MAX_ATTACHMENTS - files.length - existing.length,
            );
            if (message) {
              setError(message);
              return;
            }
            setError("");
            onChange([...files, ...unique]);
          }}
        />
      </label>
      {!available && (
        <p className="field-hint">
          File uploads are temporarily unavailable. You can save the event and
          attach files later.
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
