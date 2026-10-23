import { z } from "zod";
export const personEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.")
  .max(254);
export const permissionSchema = z.enum(["read", "write"]);
export const addPersonSchema = z
  .object({
    email: personEmailSchema,
    name: z.string().trim().max(150).default(""),
    permission: permissionSchema.default("write"),
  })
  .strict();
export const updatePersonSchema = z
  .object({
    email: personEmailSchema,
    active: z.boolean().optional(),
    permission: permissionSchema.optional(),
  })
  .strict()
  .refine(
    (input) => input.active !== undefined || input.permission !== undefined,
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
  createdAt: string;
};
