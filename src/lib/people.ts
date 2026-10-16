import { z } from "zod";
export const personEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.")
  .max(254);
export const addPersonSchema = z
  .object({
    email: personEmailSchema,
    name: z.string().trim().max(150).default(""),
  })
  .strict();
export const updatePersonSchema = z
  .object({ email: personEmailSchema, active: z.boolean() })
  .strict();
export type Person = {
  email: string;
  name: string;
  isTony: boolean;
  active: boolean;
  createdAt: string;
};
