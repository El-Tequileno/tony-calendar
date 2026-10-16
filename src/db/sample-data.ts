import { emptyEntry, type Entry } from "../lib/validation";
// Fictional examples only. No workbook content or real customer data is published.
export function sampleEntries(year = 2026, month = 10): Entry[] {
  const day = (n: number) =>
    `${year}-${String(month).padStart(2, "0")}-${String(n).padStart(2, "0")}`;
  const base = (
    id: string,
    type: Entry["type"],
    title: string,
    n: number,
  ): Entry => ({
    ...emptyEntry(type, day(n)),
    id: `00000000-0000-4000-8000-${String(id).padStart(12, "0")}`,
    title,
    revision: 1,
    updatedAt: new Date().toISOString(),
    acknowledgments: [],
    attachments: [],
    requirements: [],
    emails: [],
  });
  return [
    {
      ...base("1", "market", "Calgary customer meetings", 6),
      city: "Calgary",
      distributor: "Alberta distributor",
      startTime: "09:30",
      endTime: "15:00",
      status: "Confirmed",
      customers: [
        {
          name: "Example wine merchant",
          purpose: "Seasonal range review",
          location: "Example downtown store",
        },
        {
          name: "Example restaurant",
          purpose: "Meet the hospitality team",
          location: "Example restaurant office",
        },
      ],
    },
    {
      ...base("2", "distillery", "Canadian partner visit", 12),
      endDate: day(15),
      city: "Tequila, Mexico",
      provinces: ["BC", "AB"],
      customer: "Example visiting group",
      distributor: "British Columbia distributor",
      visitors: "Example customer team (BC) and distributor team (AB)",
      agenda: "https://example.com/visit-agenda",
    },
    {
      ...base("3", "event", "Edmonton trade tasting", 16),
      city: "Edmonton",
      location: "Example event venue",
      company: "Example partner company",
      peopleNames: "Tony and distributor team",
      activationTerms:
        "Illustrative product education and sampling activation.",
      attendance: "100",
      startTime: "18:00",
      endTime: "21:00",
      status: "Confirmed",
    },
    {
      ...base("4", "market", "Toronto partner meetings", 22),
      city: "Toronto",
      provinces: ["ON"],
      distributor: "Ontario distributor",
      timeZone: "America/Toronto",
      customers: [
        {
          name: "Example Ontario partner",
          purpose: "Account introduction",
          location: "Example Toronto office",
        },
      ],
    },
    {
      ...base("5", "event", "Vancouver brand showcase", 26),
      city: "Vancouver",
      provinces: ["BC"],
      timeZone: "America/Vancouver",
      location: "Example showcase venue",
      activationTerms: "Illustrative brand table and tasting.",
      company: "Example venue company",
    },
    {
      ...base("6", "tender", "Illustrative spirits tender", 4),
      destination: "Central Europe",
      provinces: [],
      preSubmissionDeadline: day(4),
      callBackDeadline: day(18),
      priceRange: "Example range — confirm in specification",
      requirements: [
        {
          priority: 1,
          specification:
            "Fictional spirits product requirement for demonstrating the tender form.",
        },
      ],
    },
    {
      ...base("7", "tender", "Illustrative wine tender", 18),
      destination: "Italy",
      provinces: [],
      preSubmissionDeadline: day(18),
      callBackDeadline: day(28),
      priceRange: "Example range",
      requirements: [
        { priority: 1, specification: "Fictional white wine requirement." },
        { priority: 2, specification: "Fictional red wine requirement." },
      ],
    },
    {
      ...base("8", "tender", "Illustrative regional tender", 8),
      destination: "Portugal",
      provinces: [],
      preSubmissionDeadline: day(8),
      callBackDeadline: day(22),
      priceRange: "Example range",
      requirements: [
        {
          priority: 1,
          specification: "Fictional regional product specification.",
        },
      ],
    },
  ];
}
