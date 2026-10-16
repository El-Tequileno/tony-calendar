import { afterEach, describe, expect, it, vi } from "vitest";
import { addressQuerySchema, parseGeoapifyResults } from "../src/lib/addresses";
import { searchCanadianAddresses } from "../src/server/addresses";
const venue = {
  place_id: "venue-1",
  name: "Example Venue",
  country_code: "ca",
  state: "Québec",
  city: "Montréal",
  postcode: "h2y1c6",
  street: "Rue Saint-Paul",
  housenumber: "100",
  result_type: "amenity",
  formatted: "Example Venue, 100 Rue Saint-Paul, Montréal, Canada",
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("Canadian venue search", () => {
  it("maps venue and address components, normalizes Canadian postcodes, and excludes foreign/duplicate results", () => {
    const results = parseGeoapifyResults(
      { results: [venue, venue, { ...venue, country_code: "us" }] },
      "venue",
    );
    expect(results).toEqual([
      expect.objectContaining({
        venueName: "Example Venue",
        address: "100 Rue Saint-Paul",
        city: "Montréal",
        province: "QC",
        postalCode: "H2Y 1C6",
      }),
    ]);
    expect(
      parseGeoapifyResults(
        {
          results: [
            { country_code: "ca", name: "Calgary", result_type: "city" },
          ],
        },
        "venue",
      ),
    ).toEqual([]);
    expect(
      parseGeoapifyResults(
        { results: [{ ...venue, postcode: "H2Y", housenumber: undefined }] },
        "venue",
      )[0],
    ).toMatchObject({ address: "Rue Saint-Paul", postalCode: "" });
  });
  it("accepts Places GeoJSON and province codes while preserving missing addresses", () => {
    expect(
      parseGeoapifyResults(
        {
          features: [
            {
              properties: {
                ...venue,
                result_type: undefined,
                categories: ["catering.restaurant"],
                state_code: "ON",
                street: undefined,
                housenumber: undefined,
              },
            },
          ],
        },
        "venue",
      )[0],
    ).toMatchObject({
      venueName: "Example Venue",
      address: "",
      province: "ON",
    });
  });
  it("validates input and preserves the old address-query contract", () => {
    expect(
      addressQuerySchema.parse({ query: "100 Queen Street" }),
    ).toMatchObject({ kind: "address", city: "" });
    for (const input of [
      { query: "ab" },
      { query: "venue", province: "XX" },
      { query: "venue", city: "a".repeat(101) },
      { query: "venue", kind: "invalid" },
    ])
      expect(addressQuerySchema.safeParse(input).success).toBe(false);
  });
  it("keeps the key out of URLs and limits autocomplete to Canada", async () => {
    vi.stubEnv("GEOAPIFY_API_KEY", "private-test-key");
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ results: [venue] }));
    vi.stubGlobal("fetch", fetcher);
    const result = await searchCanadianAddresses(
      addressQuerySchema.parse({
        query: "Example Venue",
        kind: "venue",
        city: "Montréal",
        province: "QC",
      }),
    );
    expect(result.provider).toBe("geoapify");
    const [url, options] = fetcher.mock.calls[0];
    expect(url.searchParams.get("filter")).toBe("countrycode:ca");
    expect(url.searchParams.get("text")).toContain("Montréal");
    expect(url.toString()).not.toContain("private-test-key");
    expect(options.headers["x-api-key"]).toBe("private-test-key");
  });
  it("falls back to Places within the entered city when autocomplete has no venues", async () => {
    vi.stubEnv("GEOAPIFY_API_KEY", "private-test-key");
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ results: [] }))
      .mockResolvedValueOnce(
        Response.json({ results: [{ place_id: "city-boundary" }] }),
      )
      .mockResolvedValueOnce(
        Response.json({
          features: [
            { properties: { ...venue, categories: ["catering.restaurant"] } },
          ],
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    const result = await searchCanadianAddresses(
      addressQuerySchema.parse({
        query: "Example Venue",
        city: "Montréal",
        kind: "venue",
      }),
    );
    expect(result.results[0].venueName).toBe("Example Venue");
    expect(fetcher.mock.calls[2][0].pathname).toBe("/v2/places");
    expect(fetcher.mock.calls[2][0].searchParams.get("filter")).toBe(
      "place:city-boundary",
    );
  });
  it("returns a safe error on provider failure and retains keyless address search", async () => {
    vi.stubEnv("GEOAPIFY_API_KEY", "private-test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("private-test-key")),
    );
    await expect(
      searchCanadianAddresses(
        addressQuerySchema.parse({ query: "venue", kind: "venue" }),
      ),
    ).rejects.toThrow("temporarily unavailable");
    vi.stubEnv("GEOAPIFY_API_KEY", "");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json([
            {
              key: "locate",
              name: "100 Queen Street, Ottawa, Ontario",
              category: "Street",
              province: "Ontario",
            },
          ]),
        ),
    );
    expect(
      (
        await searchCanadianAddresses(
          addressQuerySchema.parse({ query: "100 Queen Street" }),
        )
      ).provider,
    ).toBe("nrcan");
    await expect(
      searchCanadianAddresses(
        addressQuerySchema.parse({ query: "venue", kind: "venue" }),
      ),
    ).rejects.toThrow("Venue search is unavailable");
  });
});
