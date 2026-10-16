import { z } from "zod";
import { PROVINCES } from "./constants";
import { calendarToday } from "./dates";
const text = z.string().trim().max(10000).default("");
const date = z
  .string()
  .refine(
    (value) =>
      !value ||
      (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
        !Number.isNaN(Date.parse(value)) &&
        new Date(value).toISOString().slice(0, 10) === value),
    "Enter a valid date",
  )
  .default("");
const time = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$|^$/, "Enter a valid time")
  .default("");
export const entrySchema = z
  .object({
    type: z.enum(["market", "distillery", "event", "tender"]),
    title: z.string().trim().min(1, "Enter a title").max(250),
    startDate: date,
    endDate: date,
    startTime: time,
    endTime: time,
    timeZone: z
      .string()
      .refine((value) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }, "Select a valid time zone")
      .default("America/Edmonton"),
    provinces: z
      .array(
        z.string().refine((p) => p in PROVINCES, "Select a Canadian province"),
      )
      .max(13)
      .default([]),
    city: text,
    distributor: text,
    status: z
      .enum(["Draft", "Confirmed", "Completed", "Cancelled"])
      .default("Draft"),
    customers: z
      .array(z.object({ name: text, purpose: text, location: text }))
      .max(50)
      .default([]),
    stops: text,
    customer: text,
    visitors: text,
    agenda: z
      .string()
      .trim()
      .max(2048)
      .refine(
        (value) =>
          !value || (/^https?:\/\//i.test(value) && URL.canParse(value)),
        "Enter a full http:// or https:// agenda link",
      )
      .default(""),
    location: text,
    venueName: text,
    address: text,
    postalCode: z
      .string()
      .trim()
      .toUpperCase()
      .transform((value) => value.replace(/\s+/g, ""))
      .refine(
        (value) =>
          !value ||
          /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTVWXYZ]\d[ABCEGHJ-NPRSTVWXYZ]\d$/.test(
            value,
          ),
        "Enter a Canadian postal code, for example T2P 1J9.",
      )
      .transform((value) =>
        value ? `${value.slice(0, 3)} ${value.slice(3)}` : "",
      )
      .default(""),
    specialNotes: text,
    activationTerms: text,
    peopleNames: text,
    company: text,
    attendance: text,
    setup: text,
    products: text,
    equipment: text,
    destination: text,
    priceRange: text,
    preSubmissionDeadline: date,
    callBackDeadline: date,
    requirements: z
      .array(
        z.object({
          priority: z.coerce.number().int().min(1).max(999),
          specification: z
            .string()
            .trim()
            .min(1, "Enter a product specification")
            .max(20000),
        }),
      )
      .max(50)
      .default([]),
    emails: z
      .array(
        z.string().trim().toLowerCase().email("Enter valid invitation emails"),
      )
      .max(25)
      .default([]),
  })
  .superRefine((entry, ctx) => {
    const error = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });
    if (entry.type === "tender") {
      if (!entry.destination) error("destination", "Enter a destination");
      if (!entry.preSubmissionDeadline)
        error("preSubmissionDeadline", "Enter the pre-submission deadline");
      if (!entry.callBackDeadline)
        error("callBackDeadline", "Enter the call back deadline");
      if (entry.callBackDeadline < entry.preSubmissionDeadline)
        error(
          "callBackDeadline",
          "Call back deadline must be on or after pre-submission",
        );
      if (!entry.requirements.length)
        error("requirements", "Add at least one product requirement");
    } else {
      if (!entry.startDate) error("startDate", "Enter a start date");
      if (!entry.endDate || entry.endDate < entry.startDate)
        error("endDate", "End date must be on or after the start date");
      if (
        entry.startDate === entry.endDate &&
        entry.startTime &&
        entry.endTime &&
        entry.endTime <= entry.startTime
      )
        error("endTime", "End time must be after start time");
      if (!entry.provinces.length)
        error("provinces", "Select at least one province");
      if (
        entry.type === "market" &&
        (!entry.customers.length || entry.customers.some((c) => !c.name))
      )
        error("customers", "Enter a name for each customer");
    }
  });
export type EntryInput = z.infer<typeof entrySchema>;
type Schedule = Pick<
  EntryInput,
  | "type"
  | "startDate"
  | "endDate"
  | "preSubmissionDeadline"
  | "callBackDeadline"
>;
export function entryWriteSchema(previous?: Schedule, now?: Date) {
  return entrySchema.superRefine((entry, ctx) => {
    const today = calendarToday(now);
    const dates =
      entry.type === "tender"
        ? ([
            ["preSubmissionDeadline", "Pre-submission deadline"],
            ["callBackDeadline", "Call back deadline"],
          ] as const)
        : ([
            ["startDate", "Start date"],
            ["endDate", "End date"],
          ] as const);
    for (const [field, label] of dates) {
      // Keep historical records editable without permitting newly backdated dates.
      const unchanged =
        previous?.type === entry.type && previous[field] === entry[field];
      if (entry[field] && entry[field] < today && !unchanged)
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: `${label} cannot be in the past. Choose today or a future date.`,
        });
    }
  });
}
export type Attachment = {
  id: string;
  name: string;
  contentType: string;
  size: number;
};
export type Entry = EntryInput & {
  id: string;
  revision: number;
  updatedAt: string;
  acknowledgments: string[];
  attachments: Attachment[];
};
export const saveEntrySchema = z.object({
  data: entrySchema,
  revision: z.number().int().min(1).optional(),
});
export function emptyEntry(type: EntryInput["type"], day: string): EntryInput {
  return {
    type,
    title: "",
    startDate: day,
    endDate: day,
    startTime: "",
    endTime: "",
    timeZone: "America/Edmonton",
    provinces: ["AB"],
    city: "",
    distributor: "",
    status: "Draft",
    customers:
      type === "market" ? [{ name: "", purpose: "", location: "" }] : [],
    stops: "",
    customer: "",
    visitors: "",
    agenda: "",
    location: "",
    venueName: "",
    address: "",
    postalCode: "",
    specialNotes: "",
    activationTerms: "",
    peopleNames: "",
    company: "",
    attendance: "",
    setup: "",
    products: "",
    equipment: "",
    destination: "",
    priceRange: "",
    preSubmissionDeadline: day,
    callBackDeadline: day,
    requirements: type === "tender" ? [{ priority: 1, specification: "" }] : [],
    emails: [],
  };
}
