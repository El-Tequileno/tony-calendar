import { describe, expect, it } from "vitest";
import { entryFixtures } from "./fixtures";
import { entrySchema, eventContactFields } from "../src/lib/validation";
import { invitationText } from "../src/lib/invitation";
import { parseAddressResults } from "../src/lib/addresses";
describe("Canadian event venue fields", () => {
  it("preserves separate venue, address, postal code and special notes in event data and invitations", () => {
    const entry = {
      ...entryFixtures()[2],
      ...entrySchema.parse({
        ...entryFixtures()[2],
        venueName: "Convention Centre",
        address: "100 Queen Street",
        postalCode: "k1p1j9",
        specialNotes: "Use the side entrance.\nAsk for the event coordinator.",
      }),
    };
    expect(entry.postalCode).toBe("K1P 1J9");
    const text = invitationText(entry, "https://calendar.example");
    for (const value of [
      "Venue name: Convention Centre",
      "Address: 100 Queen Street",
      "Postal code: K1P 1J9",
      "Special Notes: Use the side entrance.",
    ])
      expect(text).toContain(value);
  });
  it("allows an empty postal code and rejects invalid Canadian codes", () => {
    const entry = entryFixtures()[2];
    expect(entrySchema.safeParse({ ...entry, postalCode: "" }).success).toBe(
      true,
    );
    for (const postalCode of ["12345", "Z1A 1A1", "T2P 123"])
      expect(entrySchema.safeParse({ ...entry, postalCode }).success).toBe(
        false,
      );
  });
  it("keeps each activation team name paired with its phone in saved data and invitations", () => {
    const entry = {
      ...entryFixtures()[2],
      ...entrySchema.parse({
        ...entryFixtures()[2],
        ownerName: "Morgan Lee",
        company: "Example Co",
        activationTeam: [
          { name: "Avery", phone: "403-555-0101" },
          { name: "Jordan", phone: "780-555-0102" },
        ],
      }),
    };
    expect(entry.activationTeam).toHaveLength(2);
    const text = invitationText(entry, "https://calendar.example");
    expect(text).toContain("Owner Name: Morgan Lee");
    expect(text).toContain("Company: Example Co");
    expect(text).toContain("Avery — 403-555-0101\nJordan — 780-555-0102");
    expect(
      entrySchema.safeParse({
        ...entry,
        activationTeam: [{ name: "", phone: "403-555-0101" }],
      }).success,
    ).toBe(false);
  });
  it("shows the old Names value as an activation team member when loading an older event", () => {
    expect(eventContactFields({ peopleNames: "Avery" })).toEqual({
      ownerName: "",
      activationTeam: [{ name: "Avery", phone: "" }],
    });
    expect(
      eventContactFields({
        peopleNames: "Avery",
        activationTeam: [],
      }).activationTeam,
    ).toEqual([]);
  });
});
describe("Canadian address results", () => {
  it("maps NRCan street results without inventing a full postal code and ignores unrelated locations", () => {
    const rows = [
      {
        key: "locate",
        category: "Street",
        name: "100 Queen Street, City Of Ottawa, Ontario",
        province: "Ontario",
      },
      {
        key: "locate",
        category: "Street",
        name: "10 Rue Test, Montréal, Québec",
        province: "Québec",
      },
      { key: "geonames", category: "Lake", name: "Queen Lake" },
    ];
    const results = parseAddressResults([...rows, rows[0]]);
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      address: "100 Queen Street",
      city: "Ottawa",
      province: "ON",
      postalCode: "",
    });
    expect(results[1].province).toBe("QC");
  });
});
