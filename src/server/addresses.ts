import { z } from "zod";
import {
  parseAddressResults,
  parseGeoapifyResults,
  type AddressQuery,
  type AddressSearchResponse,
} from "@/lib/addresses";
import { PROVINCES } from "@/lib/constants";
import { AppError } from "./errors";

async function geoapify(path: string, params: Record<string, string>) {
  const url = new URL(`https://api.geoapify.com/${path}`);
  for (const [key, value] of Object.entries(params))
    url.searchParams.set(key, value);
  // Keep credentials out of request URLs, logs and public responses.
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "x-api-key": process.env.GEOAPIFY_API_KEY!.trim(),
    },
    cache: "force-cache",
    next: { revalidate: 86400 },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Place service unavailable.");
  return response.json() as Promise<unknown>;
}

async function searchPlaces(query: AddressQuery) {
  const text = [query.query, query.city, PROVINCES[query.province || ""]]
    .filter(Boolean)
    .join(", ");
  const body = await geoapify("v1/geocode/autocomplete", {
    text,
    filter: "countrycode:ca",
    lang: "en",
    limit: "5",
    format: "json",
    ...(query.kind === "venue" ? { type: "amenity" } : {}),
  });
  const results = parseGeoapifyResults(body, query.kind);
  if (results.length || query.kind !== "venue" || !query.city) return results;
  // Some businesses are present in Places but absent from the autocomplete index.
  const area = z
    .object({ results: z.array(z.object({ place_id: z.string().optional() })) })
    .parse(
      await geoapify("v1/geocode/search", {
        text: [query.city, PROVINCES[query.province || ""], "Canada"]
          .filter(Boolean)
          .join(", "),
        type: "city",
        filter: "countrycode:ca",
        limit: "1",
        format: "json",
      }),
    ).results[0]?.place_id;
  if (!area) return [];
  return parseGeoapifyResults(
    await geoapify("v2/places", {
      name: query.query,
      categories:
        "commercial,catering,accommodation,entertainment,activity,leisure",
      filter: `place:${area}`,
      lang: "en",
      limit: "5",
    }),
    "venue",
  );
}

export async function searchCanadianAddresses(
  query: AddressQuery,
): Promise<AddressSearchResponse> {
  if (process.env.GEOAPIFY_API_KEY?.trim()) {
    try {
      return { results: await searchPlaces(query), provider: "geoapify" };
    } catch {
      throw new AppError(
        "Venue and address search is temporarily unavailable. You can enter the details manually.",
        503,
      );
    }
  }
  if (query.kind === "venue")
    throw new AppError(
      "Venue search is unavailable. Enter the venue name manually or search its street address.",
      503,
    );
  try {
    const url = new URL(
      process.env.ADDRESS_LOOKUP_URL || "https://geolocator.api.geo.ca/",
    );
    if (url.protocol !== "https:") throw new Error("Invalid service.");
    url.searchParams.set(
      "q",
      [query.query, query.city, PROVINCES[query.province || ""]]
        .filter(Boolean)
        .join(", "),
    );
    url.searchParams.set("lang", "en");
    url.searchParams.set("keys", "locate");
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "ElTequilenoCanadaCalendar/1.0",
      },
      cache: "force-cache",
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Address service unavailable.");
    return {
      results: parseAddressResults(await response.json()),
      provider: "nrcan",
    };
  } catch {
    throw new AppError(
      "Address lookup is temporarily unavailable. You can enter the address manually.",
      503,
    );
  }
}
