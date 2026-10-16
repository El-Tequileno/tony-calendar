import { z } from "zod";
import { PROVINCES } from "./constants";
export type AddressResult = {
  id: string;
  label: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
};
export const addressQuerySchema = z
  .object({
    query: z
      .string()
      .trim()
      .min(6, "Enter a street address and city to search.")
      .max(200),
  })
  .strict();
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
const resultSchema = z
  .array(
    z.object({
      key: z.string(),
      name: z.string(),
      province: z.string().optional(),
      category: z.string().optional(),
    }),
  )
  .max(1000);
export function parseAddressResults(value: unknown): AddressResult[] {
  const seen = new Set<string>();
  return resultSchema
    .parse(value)
    .filter(
      (row) =>
        row.key === "locate" &&
        ["street", "intersection"].includes(row.category?.toLowerCase() || ""),
    )
    .flatMap((row, index) => {
      if (seen.has(row.name)) return [];
      seen.add(row.name);
      const parts = row.name.split(",").map((part) => part.trim());
      const province =
        Object.entries(PROVINCES).find(
          ([code, name]) =>
            normalize(name) === normalize(row.province || "") ||
            code === row.province?.toUpperCase(),
        )?.[0] || "";
      const postalCode =
        row.name
          .match(
            /\b[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTVWXYZ]\s?\d[ABCEGHJ-NPRSTVWXYZ]\d\b/i,
          )?.[0]
          .toUpperCase() || "";
      return [
        {
          id: `locate-${index}`,
          label: row.name,
          address: parts[0],
          city:
            parts.length >= 3
              ? parts[1].replace(/^(?:City|Town|Municipality) Of /i, "")
              : "",
          province,
          postalCode,
        },
      ];
    })
    .slice(0, 5);
}
