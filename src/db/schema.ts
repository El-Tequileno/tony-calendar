import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  primaryKey,
  index,
  boolean,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { EntryInput } from "../lib/validation";
export const authorizedEmails = pgTable(
  "authorized_emails",
  {
    email: text("email").primaryKey(),
    name: text("name").notNull().default(""),
    isTony: boolean("is_tony").notNull().default(false),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("authorized_emails_single_tony")
      .on(table.isTony)
      .where(sql`${table.isTony} = true`),
    check(
      "authorized_emails_normalized",
      sql`${table.email} = lower(btrim(${table.email}))`,
    ),
    check(
      "authorized_emails_tony_active",
      sql`not ${table.isTony} or ${table.active}`,
    ),
  ],
);
export const entries = pgTable(
  "entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: text("type").$type<EntryInput["type"]>().notNull(),
    data: jsonb("data")
      .$type<Omit<EntryInput, "customers" | "requirements">>()
      .notNull(),
    revision: integer("revision").default(1).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("entries_type_idx").on(table.type)],
);
export const customerMeetings = pgTable(
  "customer_meetings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    name: text("name").notNull(),
    purpose: text("purpose").notNull(),
    location: text("location").notNull(),
  },
  (t) => [index("customer_entry_idx").on(t.entryId)],
);
export const tenderRequirements = pgTable(
  "tender_requirements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    priority: integer("priority").notNull(),
    specification: text("specification").notNull(),
  },
  (t) => [index("requirement_entry_idx").on(t.entryId)],
);
export const acknowledgments = pgTable(
  "acknowledgments",
  {
    entryId: uuid("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.entryId, t.email] })],
);
export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    key: text("storage_key").notNull(),
    name: text("name").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
  },
  (t) => [index("attachment_entry_idx").on(t.entryId)],
);
export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    requestedBy: text("requested_by").notNull(),
    status: text("status").notNull(),
    providerId: text("provider_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("invitation_entry_idx").on(t.entryId)],
);
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  hits: integer("hits").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
