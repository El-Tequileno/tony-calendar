"use client";
import { useState } from "react";
import {
  ExternalLink,
  Mail,
  Pencil,
  Upload,
  FileText,
  Trash2,
} from "lucide-react";
import { Panel } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CATEGORIES, PROVINCES } from "@/lib/constants";
import { formatDay, when } from "@/lib/dates";
import type { Entry } from "@/lib/validation";
import { api, RequestError } from "@/lib/api";
import { invitationBodyHtml, invitationSubject } from "@/lib/invitation";
export type Capabilities = {
  emailSending: boolean;
  uploads: boolean;
};
function Item({ label, value }: { label: string; value?: string }) {
  return (
    <div className="detail-item">
      <dt>{label}</dt>
      <dd>{value || <span className="muted">Not entered</span>}</dd>
    </div>
  );
}
function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="detail-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}
export function EntryDetail({
  entry,
  email,
  capabilities,
  onClose,
  onEdit,
  onUpdated,
  onDeleted,
  onMessage,
}: {
  entry: Entry;
  email: string;
  capabilities: Capabilities;
  onClose: () => void;
  onEdit: () => void;
  onUpdated: (e: Entry) => void;
  onDeleted: (id: string) => void;
  onMessage: (message: string) => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Entry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  async function acknowledge(checked: boolean) {
    setBusy(true);
    setError("");
    try {
      const { entry: updated } = await api<{ entry: Entry }>(
        `/api/entries/${entry.id}/acknowledgment`,
        { method: "POST", body: JSON.stringify({ checked }) },
      );
      onUpdated(updated);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to save acknowledgment.",
      );
    } finally {
      setBusy(false);
    }
  }
  const category = CATEGORIES[entry.type];
  return (
    <>
      <Panel
        open
        onClose={onClose}
        title={entry.title}
        eyebrow="CALENDAR ENTRY"
        footer={
          <>
            <Button
              variant="secondary"
              className="entry-delete-button"
              disabled={busy || sending}
              onClick={() => {
                setDeleteError("");
                setDeleteTarget(entry);
              }}
            >
              <Trash2 size={14} />
              Delete entry
            </Button>
            <Button variant="secondary" onClick={onEdit}>
              <Pencil size={14} />
              Edit entry
            </Button>
            <Button
              disabled={!entry.emails.length}
              onClick={() => setPreview(true)}
            >
              <Mail size={14} />
              Invite by email
            </Button>
          </>
        }
      >
        <span
          className="category-badge"
          style={{ background: category.background, color: category.color }}
        >
          ● {category.singular}
        </span>
        {entry.type === "tender" ? (
          <div className="deadline-pair">
            <div>
              <span>Pre-submission Deadline</span>
              <strong>{formatDay(entry.preSubmissionDeadline)}</strong>
            </div>
            <div>
              <span>Call Back Deadline</span>
              <strong>{formatDay(entry.callBackDeadline)}</strong>
            </div>
          </div>
        ) : (
          <div className="detail-hero">
            <strong>{when(entry)}</strong>
            <p>
              {[entry.city, entry.provinces.map((p) => PROVINCES[p]).join(", ")]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        )}
        <Group title={entry.type === "tender" ? "Tender overview" : "Overview"}>
          <dl className="detail-grid">
            {entry.type === "tender" ? (
              <>
                <Item label="Destination(s)" value={entry.destination} />
                <Item label="Tender" value={entry.title} />
                <Item label="Price Range" value={entry.priceRange} />
              </>
            ) : (
              <>
                <Item
                  label="Province(s)"
                  value={entry.provinces.map((p) => PROVINCES[p]).join(", ")}
                />
                <Item
                  label="Responsible distributor"
                  value={entry.distributor}
                />
                {entry.type !== "distillery" && (
                  <Item label="Status" value={entry.status} />
                )}
              </>
            )}
          </dl>
        </Group>
        {entry.type === "market" && (
          <>
            <Group title="Customer meetings">
              <div className="customer-meetings">
                {entry.customers.map((customer, index) => (
                  <article className="customer-card" key={index}>
                    <h4>Customer {index + 1}</h4>
                    <dl>
                      <Item label="Customer name" value={customer.name} />
                      <Item label="Meeting purpose" value={customer.purpose} />
                      <Item
                        label="Meeting location"
                        value={customer.location}
                      />
                    </dl>
                  </article>
                ))}
              </div>
            </Group>
            {entry.stops && (
              <Group title="Customer stops">
                <p className="multiline">{entry.stops}</p>
              </Group>
            )}
          </>
        )}
        {entry.type === "distillery" && (
          <Group title="Visitors & agenda">
            <dl>
              <Item label="Customer name" value={entry.customer} />
              <Item label="People going" value={entry.visitors} />
            </dl>
            {entry.agenda ? (
              <a
                className="agenda-link"
                href={entry.agenda}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open visit agenda
                <ExternalLink size={14} />
              </a>
            ) : (
              <p className="muted">No agenda link added.</p>
            )}
          </Group>
        )}
        {entry.type === "event" && (
          <>
            <Group title="Activation">
              <dl>
                <Item label="Venue / address" value={entry.location} />
                <Item label="Customer" value={entry.customer} />
                <Item label="Activation terms" value={entry.activationTerms} />
                <div className="detail-grid">
                  <Item label="Names" value={entry.peopleNames} />
                  <Item label="Company" value={entry.company} />
                  <Item label="Expected attendance" value={entry.attendance} />
                  <Item label="Setup / teardown" value={entry.setup} />
                </div>
                <Item
                  label="Products and serving plan"
                  value={entry.products}
                />
                <Item label="Equipment and materials" value={entry.equipment} />
              </dl>
            </Group>
            <Group title="Serving alcohol certificates">
              <div className="attachments">
                {entry.attachments.map((file) => (
                  <a
                    key={file.id}
                    href={`/api/entries/${entry.id}/attachments/${file.id}`}
                  >
                    <FileText size={16} />
                    <span>
                      {file.name}
                      <small>{Math.round(file.size / 1024)} KB</small>
                    </span>
                    Download
                  </a>
                ))}
              </div>
              {!entry.attachments.length && (
                <p className="muted">No certificate uploaded yet.</p>
              )}
              <label
                className={`upload-zone ${!capabilities.uploads ? "disabled" : ""}`}
              >
                <Upload size={18} />
                <span>
                  {busy ? "Uploading…" : "Upload certificate / proof"}
                  <small>PDF, JPEG, PNG, or WebP · maximum 4 MB</small>
                </span>
                <input
                  aria-label="Upload serving alcohol certificate"
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  disabled={busy || !capabilities.uploads}
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setError("");
                    setBusy(true);
                    const data = new FormData();
                    data.set("file", file);
                    try {
                      const result = await api<{ entry: Entry }>(
                        `/api/entries/${entry.id}/attachments`,
                        { method: "POST", body: data },
                      );
                      onUpdated(result.entry);
                      onMessage("Certificate uploaded.");
                    } catch (error) {
                      setError(
                        error instanceof Error
                          ? error.message
                          : "Upload failed.",
                      );
                    } finally {
                      setBusy(false);
                      event.target.value = "";
                    }
                  }}
                />
              </label>
              {!capabilities.uploads && (
                <p className="field-hint">
                  File uploads become available when the shared database and
                  certificate storage are configured.
                </p>
              )}
            </Group>
          </>
        )}
        {entry.type === "tender" && (
          <Group title="Product requirements">
            {entry.requirements.map((requirement, index) => (
              <article className="requirement-detail" key={index}>
                <div>
                  <span>Priority</span>
                  <strong>{requirement.priority}</strong>
                </div>
                <div>
                  <span>Product Specification</span>
                  <p>{requirement.specification}</p>
                </div>
              </article>
            ))}
          </Group>
        )}
        <Group title="Distributor acknowledgment">
          <p className="field-hint">Recording acknowledgment as {email}.</p>
          <label className="ack-label">
            <input
              type="checkbox"
              checked={entry.acknowledgments.includes(email)}
              disabled={busy}
              onChange={(event) => acknowledge(event.target.checked)}
            />
            I acknowledge this entry
          </label>
          <p className="ack-status">
            {entry.acknowledgments.length
              ? `Acknowledged by: ${entry.acknowledgments.join(", ")}`
              : "No acknowledgments yet."}
          </p>
        </Group>
        <Group title="Invite by email">
          <div className="email-chips">
            {entry.emails.length ? (
              entry.emails.map((address) => (
                <span key={address}>{address}</span>
              ))
            ) : (
              <p className="muted">
                No recipients added. Edit the entry to add email addresses.
              </p>
            )}
          </div>
          <p className="field-hint">
            Informational invitations. No RSVP is requested.
          </p>
        </Group>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </Panel>
      <Panel
        open={!!deleteTarget}
        onClose={() => {
          if (!deleting) {
            setDeleteTarget(null);
            setDeleteError("");
          }
        }}
        title="Delete entry?"
        eyebrow="CONFIRM DELETION"
        modal
        footer={
          <>
            <Button
              variant="secondary"
              disabled={deleting}
              onClick={() => {
                setDeleteTarget(null);
                setDeleteError("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={deleting}
              onClick={async () => {
                if (!deleteTarget) return;
                setDeleting(true);
                setDeleteError("");
                try {
                  await api(`/api/entries/${deleteTarget.id}`, {
                    method: "DELETE",
                    body: JSON.stringify({ revision: deleteTarget.revision }),
                  });
                  onDeleted(deleteTarget.id);
                  onMessage("Entry deleted.");
                } catch (error) {
                  if (error instanceof RequestError && error.status === 404) {
                    onDeleted(deleteTarget.id);
                    onMessage("This entry was already deleted.");
                  } else
                    setDeleteError(
                      error instanceof Error
                        ? error.message
                        : "Unable to delete this entry.",
                    );
                } finally {
                  setDeleting(false);
                }
              }}
            >
              <Trash2 size={14} />
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </>
        }
      >
        <div className="delete-entry-summary">
          <strong>{deleteTarget?.title}</strong>
          <span>{CATEGORIES[deleteTarget?.type || entry.type].singular}</span>
          <p>{when(deleteTarget || entry)}</p>
        </div>
        <p className="delete-entry-message">
          This entry will be removed from the shared calendar for everyone. This
          cannot be undone.
        </p>
        {deleteTarget?.type === "tender" && (
          <p className="field-hint">
            Both the pre-submission and call back dates will be removed.
          </p>
        )}
        {deleteError && (
          <p className="form-error" role="alert">
            {deleteError}
          </p>
        )}
      </Panel>
      <Panel
        open={preview}
        onClose={() => {
          if (!sending) setPreview(false);
        }}
        title="Send invitations"
        eyebrow="EMAIL PREVIEW"
        modal
        footer={
          <>
            <Button
              variant="secondary"
              disabled={sending}
              onClick={() => setPreview(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={sending || !capabilities.emailSending}
              onClick={async () => {
                setSending(true);
                setError("");
                try {
                  const result = await api<{ message: string }>(
                    `/api/entries/${entry.id}/invitations`,
                    { method: "POST", body: "{}" },
                  );
                  setPreview(false);
                  onMessage(result.message);
                } catch (error) {
                  setError(
                    error instanceof Error ? error.message : "Sending failed.",
                  );
                } finally {
                  setSending(false);
                }
              }}
            >
              {sending ? "Sending…" : "Send invitations"}
            </Button>
          </>
        }
      >
        <p className="field-hint">
          <strong>To:</strong> {entry.emails.join(", ")}
          <br />
          <strong>Subject:</strong> {invitationSubject(entry)}
        </p>
        <article
          className="email-preview"
          aria-label="Invitation email preview"
          dangerouslySetInnerHTML={{
            __html: invitationBodyHtml(
              entry,
              typeof window === "undefined"
                ? "https://calendar.example"
                : window.location.origin,
            ),
          }}
        />
        {!capabilities.emailSending && (
          <div className="service-note">
            Email sending is not enabled. Configure the sender and email
            provider to send real invitations.
          </div>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </Panel>
    </>
  );
}
