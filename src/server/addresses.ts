import { parseAddressResults } from "@/lib/addresses";
import { AppError } from "./errors";
export async function searchCanadianAddresses(query: string) {
  const url = new URL(
    process.env.ADDRESS_LOOKUP_URL || "https://geolocator.api.geo.ca/",
  );
  if (url.protocol !== "https:")
    throw new AppError(
      "Address lookup is unavailable. Enter the address manually.",
      503,
    );
  url.searchParams.set("q", query);
  url.searchParams.set("lang", "en");
  url.searchParams.set("keys", "locate");
  try {
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
    return parseAddressResults(await response.json());
  } catch {
    throw new AppError(
      "Address lookup is temporarily unavailable. You can enter the address manually.",
      503,
    );
  }
}
