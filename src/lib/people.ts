import { z } from "zod";
export const personEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.")
  .max(254);
export const permissionSchema = z.enum(["read", "write"]);
export const calendarSchema = z.enum([
  "market",
  "distillery",
  "event",
  "tender",
]);
export const calendarsSchema = z
  .array(calendarSchema)
  .max(4)
  .refine((items) => new Set(items).size === items.length);
export const ALL_CALENDARS = [
  "market",
  "distillery",
  "event",
  "tender",
] as const;
export const addPersonSchema = z
  .object({
    email: personEmailSchema,
    name: z.string().trim().max(150).default(""),
    permission: permissionSchema.default("write"),
    calendars: calendarsSchema.default([...ALL_CALENDARS]),
  })
  .strict();
export const updatePersonSchema = z
  .object({
    email: personEmailSchema,
    active: z.boolean().optional(),
    permission: permissionSchema.optional(),
    calendars: calendarsSchema.optional(),
  })
  .strict()
  .refine(
    (input) =>
      input.active !== undefined ||
      input.permission !== undefined ||
      input.calendars !== undefined,
    {
      message: "Choose an access change.",
    },
  );
export type Permission = z.infer<typeof permissionSchema>;
export type InviteRecipient = { email: string; name: string };
export type Person = {
  email: string;
  name: string;
  isTony: boolean;
  active: boolean;
  permission: Permission;
  calendars: z.infer<typeof calendarSchema>[];
  createdAt: string;
};
