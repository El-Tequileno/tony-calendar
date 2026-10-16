"use client";
import { useState } from "react";
import {
  useForm,
  useFieldArray,
  type Path,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { Panel } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  CATEGORIES,
  PROVINCES,
  TIMEZONES,
  type Category,
} from "@/lib/constants";
import {
  entryWriteSchema,
  emptyEntry,
  type Entry,
  type EntryInput,
} from "@/lib/validation";
import { api } from "@/lib/api";
import type { AddressResult } from "@/lib/addresses";
import { calendarToday } from "@/lib/dates";
import { AddressField } from "./address-field";
import { DocumentPicker } from "./document-picker";

export function EntryForm({
  entry,
  type,
  day,
  destinations,
  uploadsEnabled,
  onClose,
  onSaved,
}: {
  entry?: Entry;
  type: Category;
  day: string;
  destinations: string[];
  uploadsEnabled: boolean;
  onClose: () => void;
  onSaved: (entry: Entry) => void;
}) {
  const [category, setCategory] = useState(type);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedEntry, setSavedEntry] = useState<Entry | undefined>(entry);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState("");
  const [emailText, setEmailText] = useState(entry?.emails.join(", ") || "");
  const today = calendarToday();
  const initialDay = day < today ? today : day;
  const form = useForm<EntryInput>({
    resolver: zodResolver(entryWriteSchema(savedEntry)) as Resolver<EntryInput>,
    defaultValues: entry || emptyEntry(type, initialDay),
  });
  const customers = useFieldArray({ control: form.control, name: "customers" });
  const requirements = useFieldArray({
    control: form.control,
    name: "requirements",
  });
  const { register } = form;
  function selectLocation(result: AddressResult) {
    for (const name of ["venueName", "address", "city"] as const) {
      if (result[name])
        form.setValue(name, result[name], { shouldDirty: true });
      else if (name === "address")
        form.setValue(name, "", { shouldDirty: true });
    }
    if (result.province)
      form.setValue("provinces", [result.province], { shouldDirty: true });
    form.setValue("postalCode", result.postalCode || "", { shouldDirty: true });
  }
  function closeForm() {
    if (busy) return;
    if (savedEntry && savedEntry !== entry) onSaved(savedEntry);
    else onClose();
  }
  const startDate = form.watch("startDate");
  const preSubmissionDeadline = form.watch("preSubmissionDeadline");
  function minimumDate(name: Path<EntryInput>) {
    const earlierDate =
      name === "endDate"
        ? startDate
        : name === "callBackDeadline"
          ? preSubmissionDeadline
          : "";
    return earlierDate > today ? earlierDate : today;
  }
  function field(
    name: Path<EntryInput>,
    label: string,
    kind = "text",
    options?: { full?: boolean; required?: boolean; hint?: string },
  ) {
    return (
      <label className={`field ${options?.full ? "full" : ""}`} key={name}>
        <span>
          {label}
          {options?.required ? " *" : ""}
        </span>
        {kind === "textarea" ? (
          <textarea {...register(name)} rows={3} />
        ) : (
          <input
            {...register(name)}
            type={kind}
            min={kind === "date" ? minimumDate(name) : undefined}
            step={kind === "number" ? "1" : undefined}
          />
        )}{" "}
        {options?.hint && <small>{options.hint}</small>}
      </label>
    );
  }
  function select(
    name: Path<EntryInput>,
    label: string,
    values: Record<string, string>,
  ) {
    return (
      <label className="field" key={name}>
        <span>{label}</span>
        <select {...register(name)}>
          {Object.entries(values).map(([value, name]) => (
            <option key={value} value={value}>
              {name}
            </option>
          ))}
        </select>
      </label>
    );
  }
  const submit = form.handleSubmit(
    async (data) => {
      if (data.type === "event") data.location = "";
      setBusy(true);
      setError("");
      try {
        const result = await api<{ entry: Entry }>(
          savedEntry ? `/api/entries/${savedEntry.id}` : "/api/entries",
          {
            method: savedEntry ? "PUT" : "POST",
            body: JSON.stringify({ data, revision: savedEntry?.revision }),
          },
        );
        let updated = result.entry;
        setSavedEntry(updated);
        for (let index = 0; index < pendingFiles.length; index++) {
          const file = pendingFiles[index];
          setUploadProgress(
            `Uploading ${index + 1} of ${pendingFiles.length}…`,
          );
          const body = new FormData();
          body.set("file", file);
          try {
            const response = await api<{ entry: Entry }>(
              `/api/entries/${updated.id}/attachments`,
              { method: "POST", body },
            );
            updated = response.entry;
            // Keep the form's saved revision so a retry cannot overwrite later edits.
            setSavedEntry({ ...updated, revision: result.entry.revision });
            setPendingFiles((remaining) =>
              remaining.filter((item) => item !== file),
            );
          } catch (error) {
            setError(
              `The event was saved, but ${file.name} could not upload. ${error instanceof Error ? error.message : "Try again."} Save again to retry the remaining files, or close to keep the saved event.`,
            );
            return;
          }
        }
        onSaved(updated);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Unable to save.");
      } finally {
        setBusy(false);
        setUploadProgress("");
      }
    },
    (errors) => {
      function messages(value: unknown): string[] {
        if (!value || typeof value !== "object") return [];
        if ("message" in value && typeof value.message === "string")
          return [value.message];
        return Object.values(value).flatMap(messages);
      }
      setError(messages(errors)[0] || "Please check the required fields.");
    },
  );
  return (
    <Panel
      open
      onClose={closeForm}
      title={
        savedEntry
          ? "Edit calendar entry"
          : category === "tender"
            ? "Create a provincial tender call"
            : "Create a calendar entry"
      }
      eyebrow={savedEntry ? "EDIT ENTRY" : "NEW ENTRY"}
      footer={
        <>
          <Button variant="secondary" onClick={closeForm} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="entry-form" disabled={busy}>
            {busy
              ? uploadProgress || "Saving…"
              : category === "tender"
                ? "Save tender"
                : "Save entry"}
          </Button>
        </>
      }
    >
      <p className="form-intro">
        {category === "tender"
          ? "One tender creates two linked calendar deadlines."
          : "Add the details everyone needs to plan the visit or event."}
      </p>
      <div className="form-type-tabs" aria-label="Entry type">
        {Object.entries(CATEGORIES).map(([key, info]) => (
          <button
            type="button"
            disabled={!!savedEntry || busy}
            key={key}
            className={`type-tab ${category === key ? "selected" : ""}`}
            onClick={() => {
              const next = key as Category;
              setCategory(next);
              form.reset(emptyEntry(next, initialDay));
              setEmailText("");
              setPendingFiles([]);
              setError("");
            }}
          >
            <i style={{ background: info.color }} />
            {info.label}
          </button>
        ))}
      </div>
      <form id="entry-form" onSubmit={submit} noValidate>
        <fieldset className="entry-fields" disabled={busy}>
          <section className="form-section">
            <h3>{category === "tender" ? "Tender details" : "When and who"}</h3>
            <div className="form-grid">
              {field(
                "title",
                category === "tender" ? "Tender" : "Entry title",
                "text",
                { full: true, required: true },
              )}
              {category === "tender" ? (
                <>
                  <label className="field full">
                    <span>Destination(s) *</span>
                    <input
                      list="destination-options"
                      {...register("destination")}
                    />
                    <datalist id="destination-options">
                      {destinations.map((d) => (
                        <option key={d} value={d} />
                      ))}
                    </datalist>
                  </label>
                  {field("priceRange", "Price Range", "text", { full: true })}
                  {field(
                    "preSubmissionDeadline",
                    "Pre-submission Deadline",
                    "date",
                    { required: true },
                  )}
                  {field("callBackDeadline", "Call Back Deadline", "date", {
                    required: true,
                  })}
                </>
              ) : (
                <>
                  {field("startDate", "Start date", "date", { required: true })}
                  {field("endDate", "End date", "date", { required: true })}
                  {category !== "distillery" && (
                    <>
                      {field("startTime", "Start time", "time")}
                      {field("endTime", "End time", "time")}
                      {select(
                        "timeZone",
                        "Meeting / event time zone",
                        Object.fromEntries(
                          TIMEZONES.map((t) => [t, t.replaceAll("_", " ")]),
                        ),
                      )}
                    </>
                  )}
                  {field("distributor", "Responsible distributor")}
                  {category !== "distillery" &&
                    select(
                      "status",
                      "Status",
                      Object.fromEntries(
                        ["Draft", "Confirmed", "Completed", "Cancelled"].map(
                          (s) => [s, s],
                        ),
                      ),
                    )}
                </>
              )}
            </div>
          </section>
          {category !== "tender" && (
            <section className="form-section">
              <h3>{CATEGORIES[category].singular} details</h3>
              <div className="form-grid">
                {category === "distillery" ? (
                  <label className="field full">
                    <span>Canadian province(s) of visiting parties *</span>
                    <select multiple {...register("provinces")} size={5}>
                      {Object.entries(PROVINCES).map(([id, label]) => (
                        <option value={id} key={id}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <small>
                      Choose the Canadian home provinces of the customers or
                      distributors travelling. Hold Ctrl or Command to select
                      more than one.
                    </small>
                  </label>
                ) : (
                  <label className="field">
                    <span>Province *</span>
                    <select
                      value={form.watch("provinces")[0] || "AB"}
                      onChange={(e) =>
                        form.setValue("provinces", [e.target.value], {
                          shouldDirty: true,
                        })
                      }
                    >
                      {Object.entries(PROVINCES).map(([id, label]) => (
                        <option value={id} key={id}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {field(
                  "city",
                  category === "distillery" ? "Destination city" : "City",
                )}
                {category === "distillery" && (
                  <>
                    {field("customer", "Customer name", "text", { full: true })}
                    {field("visitors", "People going", "textarea", {
                      full: true,
                    })}
                    {field("agenda", "Agenda link", "url", {
                      full: true,
                      hint: "Link to the separate agenda with itinerary and travel details.",
                    })}
                  </>
                )}
                {category === "event" && (
                  <>
                    <AddressField
                      kind="venue"
                      value={form.watch("venueName")}
                      city={form.watch("city")}
                      province={form.watch("provinces")[0]}
                      disabled={busy}
                      onChange={(value) =>
                        form.setValue("venueName", value, { shouldDirty: true })
                      }
                      onSelect={selectLocation}
                    />
                    <AddressField
                      value={form.watch("address")}
                      city={form.watch("city")}
                      province={form.watch("provinces")[0]}
                      disabled={busy}
                      onChange={(value) =>
                        form.setValue("address", value, { shouldDirty: true })
                      }
                      onSelect={selectLocation}
                    />
                    {field("postalCode", "Postal code", "text", {
                      hint: "Canadian postal code, for example T2P 1J9.",
                    })}
                    {field("customer", "Customer name, if applicable")}
                    {field("attendance", "Expected attendance", "number")}
                    {field("activationTerms", "Activation terms", "textarea", {
                      full: true,
                    })}
                    {field("peopleNames", "Names")}
                    {field("company", "Company")}
                    {field("setup", "Setup / teardown", "text", { full: true })}
                    {field(
                      "products",
                      "Products and serving plan",
                      "textarea",
                      {
                        full: true,
                      },
                    )}
                    {field("equipment", "Equipment and materials", "textarea", {
                      full: true,
                    })}
                    {field("specialNotes", "Special Notes", "textarea", {
                      full: true,
                    })}
                  </>
                )}
              </div>
              {category === "market" && (
                <>
                  <div className="customers-editor">
                    {customers.fields.map((customer, index) => (
                      <fieldset className="customer-card" key={customer.id}>
                        <legend>Customer {index + 1}</legend>
                        <div className="form-grid">
                          {field(
                            `customers.${index}.name`,
                            "Customer name",
                            "text",
                            { full: true, required: true },
                          )}
                          {field(
                            `customers.${index}.purpose`,
                            "Meeting purpose",
                            "text",
                            { full: true },
                          )}
                          {field(
                            `customers.${index}.location`,
                            "Meeting location",
                            "text",
                            { full: true },
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          className="remove-button"
                          aria-label={`Remove customer ${index + 1}`}
                          disabled={customers.fields.length === 1}
                          onClick={() => customers.remove(index)}
                        >
                          <Trash2 size={13} />
                          Remove customer
                        </Button>
                      </fieldset>
                    ))}
                  </div>
                  <Button
                    variant="secondary"
                    disabled={customers.fields.length >= 50}
                    onClick={() =>
                      customers.append({ name: "", purpose: "", location: "" })
                    }
                  >
                    <Plus size={14} />
                    Add customer
                  </Button>
                  <div className="form-grid mt-5">
                    {field("stops", "Customer stops", "textarea", {
                      full: true,
                      hint: "Optional meeting times and stops, one per line.",
                    })}
                  </div>
                </>
              )}
            </section>
          )}
          {category === "tender" && (
            <section className="form-section">
              <h3>Product requirements</h3>
              {requirements.fields.map((row, index) => (
                <fieldset className="requirement-card" key={row.id}>
                  <legend>Requirement {index + 1}</legend>
                  <div className="form-grid">
                    {field(
                      `requirements.${index}.priority`,
                      "Priority",
                      "number",
                      { required: true },
                    )}
                    {field(
                      `requirements.${index}.specification`,
                      "Product Specification",
                      "textarea",
                      { full: true, required: true },
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    className="remove-button"
                    aria-label={`Remove requirement ${index + 1}`}
                    disabled={requirements.fields.length === 1}
                    onClick={() => requirements.remove(index)}
                  >
                    <Trash2 size={13} />
                    Remove requirement
                  </Button>
                </fieldset>
              ))}
              <Button
                variant="secondary"
                disabled={requirements.fields.length >= 50}
                onClick={() =>
                  requirements.append({
                    priority: requirements.fields.length + 1,
                    specification: "",
                  })
                }
              >
                <Plus size={14} />
                Add priority / specification
              </Button>
            </section>
          )}
          {category === "event" && (
            <DocumentPicker
              files={pendingFiles}
              existing={savedEntry?.attachments || []}
              entryId={savedEntry?.id}
              disabled={busy}
              available={uploadsEnabled}
              onChange={(files) => {
                setPendingFiles(files);
                setError("");
              }}
            />
          )}
          <section className="form-section">
            <h3>Invite by email</h3>
            <label className="field">
              <span>Email addresses</span>
              <textarea
                rows={2}
                value={emailText}
                onChange={(event) => {
                  setEmailText(event.target.value);
                  form.setValue(
                    "emails",
                    [
                      ...new Set(
                        event.target.value
                          .split(/[,;\n]/)
                          .map((e) => e.trim().toLowerCase())
                          .filter(Boolean),
                      ),
                    ],
                    { shouldDirty: true },
                  );
                }}
              />
              <small>
                Separate addresses with commas. Send invitations after saving.
                No RSVP is requested.
              </small>
            </label>
          </section>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
        </fieldset>
      </form>
    </Panel>
  );
}
