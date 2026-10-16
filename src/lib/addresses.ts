import { z } from "zod";
import { PROVINCES } from "./constants";
export type AddressResult = {
  id: string;
  label: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  venueName?: string;
};
export const addressQuerySchema = z
  .object({
    query: z
      .string()
      .trim()
      .min(3, "Enter at least three characters to search.")
      .max(200),
    kind: z.enum(["address", "venue"]).default("address"),
    city: z.string().trim().max(100).default(""),
    province: z
      .enum(Object.keys(PROVINCES) as [string, ...string[]])
      .optional(),
  })
  .strict();
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
export type AddressQuery = z.infer<typeof addressQuerySchema>;
export type AddressSearchResponse = {
  results: AddressResult[];
  provider: "geoapify" | "nrcan";
};
function provinceCode(value: string) {
  const code = value.replace(/^CA-/i, "").toUpperCase();
  return (
    Object.entries(PROVINCES).find(
      ([key, name]) => key === code || normalize(name) === normalize(value),
    )?.[0] || ""
  );
}
const geoapifyProperties = z.object({
  place_id: z.string().optional(),
  name: z.string().optional(),
  country_code: z.string().optional(),
  state: z.string().optional(),
  state_code: z.string().optional(),
  iso3166_2: z.string().optional(),
  city: z.string().optional(),
  town: z.string().optional(),
  village: z.string().optional(),
  postcode: z.string().optional(),
  street: z.string().optional(),
  housenumber: z.string().optional(),
  formatted: z.string().optional(),
  result_type: z.string().optional(),
  categories: z.array(z.string()).optional(),
});
export function parseGeoapifyResults(
  value: unknown,
  kind: "address" | "venue",
): AddressResult[] {
  const body = z
    .object({
      results: z.array(geoapifyProperties).max(100).optional(),
      features: z
        .array(z.object({ properties: geoapifyProperties }))
        .max(100)
        .optional(),
    })
    .parse(value);
  const seen = new Set<string>();
  return (body.results || body.features?.map((row) => row.properties) || [])
    .flatMap((row) => {
      if (row.country_code?.toLowerCase() !== "ca") return [];
      const venueName =
        row.result_type === "amenity" || row.categories?.length
          ? row.name || ""
          : "";
      if (kind === "venue" && !venueName) return [];
      const address = [row.housenumber, row.street].filter(Boolean).join(" ");
      if (!address && !venueName) return [];
      const city = row.city || row.town || row.village || "";
      const province = provinceCode(
        row.state_code || row.iso3166_2 || row.state || "",
      );
      const rawPostal = row.postcode?.replace(/\s/g, "").toUpperCase() || "";
      const postalCode =
        /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTVWXYZ]\d[ABCEGHJ-NPRSTVWXYZ]\d$/.test(
          rawPostal,
        )
          ? `${rawPostal.slice(0, 3)} ${rawPostal.slice(3)}`
          : "";
      const label =
        row.formatted ||
        [venueName, address, city, province, postalCode]
          .filter(Boolean)
          .join(", ");
      if (seen.has(label)) return [];
      seen.add(label);
      return [
        {
          id: row.place_id || `geoapify-${seen.size}`,
          label,
          venueName,
          address,
          city,
          province,
          postalCode,
        },
      ];
    })
    .slice(0, 5);
}
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
