import { describe, expect, it } from "vitest";
import { invitationHtml, invitationText } from "../src/lib/invitation";
import { entryFixtures } from "./fixtures";

describe("invitation email formatting", () => {
  it("includes Saturday slots and their timezone in both email formats", () => {
    const entry = {
      ...entryFixtures()[2],
      startDate: "2026-10-16",
      endDate: "2026-10-17",
      startTime: "14:00",
      endTime: "18:00",
      saturdaySchedules: [
        {
          date: "2026-10-17",
          firstStart: "13:00",
          firstEnd: "16:00",
          secondStart: "19:00",
          secondEnd: "22:00",
        },
      ],
    };
    for (const email of [
      invitationText(entry, "https://calendar.example"),
      invitationHtml(entry, "https://calendar.example"),
    ]) {
      for (const value of [
        "Regular start time",
        "Saturday October 17, 2026",
        "replaces regular times",
        "13:00–16:00",
        "19:00–22:00",
        "America/Edmonton",
      ])
        expect(email).toContain(value);
    }
  });
  it("includes Casa Salles travel details and multiple participants in both formats", () => {
    const entry = {
      ...entryFixtures()[1],
      provinces: ["AB", "BC"],
      airportPickup: "GDL" as const,
      checkInTime: "15:00",
      checkOutTime: "11:00",
      flightNumber: "AC123",
      flightArrivalTime: "13:30",
      flightDepartureTime: "17:00",
      participants: [
        { name: "Alex", comments: "Vegetarian" },
        { name: "Sam", comments: "Window seat" },
      ],
      additionalComments: "Extra notes",
    };
    for (const email of [
      invitationText(entry, "https://calendar.example"),
      invitationHtml(entry, "https://calendar.example"),
    ]) {
      for (const value of [
        "Alberta",
        "British Columbia",
        "GDL",
        "15:00",
        "11:00",
        "AC123",
        "13:30",
        "17:00",
        "Alex",
        "Vegetarian",
        "Sam",
        "Window seat",
        "Extra notes",
      ])
        expect(email).toContain(value);
    }
  });
  it("shows the public El Tequileño logo above the invitation content", () => {
    const html = invitationHtml(entryFixtures()[0], "https://calendar.example");
    const logo =
      '<img src="https://calendar.example/brand/el-tequileno-white.png"';
    expect(html).toContain(logo);
    expect(html).toContain('alt="Tequila El Tequileño"');
    expect(html.indexOf(logo)).toBeLessThan(html.indexOf("<h1"));
  });
  it("keeps dates separate from start/end times and the time zone in HTML and plain text", () => {
    const entry = {
      ...entryFixtures()[2],
      startTime: "15:00",
      endTime: "18:00",
    };
    const html = invitationHtml(entry, "https://calendar.example");
    const emailRows = [...html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(
      (match) => match[1],
    );
    expect(emailRows.find((row) => row.includes(">When</td>"))).toContain(
      "October 20, 2026</td>",
    );
    expect(emailRows.find((row) => row.includes(">When</td>"))).not.toContain(
      "15:00",
    );
    expect(emailRows.find((row) => row.includes(">Start time</td>"))).toContain(
      "15:00</td>",
    );
    expect(emailRows.find((row) => row.includes(">End time</td>"))).toContain(
      "18:00</td>",
    );
    const text = invitationText(entry, "https://calendar.example");
    expect(text).toContain(
      "When: October 20, 2026\n\nStart time: 15:00\n\nEnd time: 18:00\n\nTime zone: America/Edmonton",
    );
    expect(
      invitationText(
        { ...entry, endDate: "2026-10-21" },
        "https://calendar.example",
      ),
    ).toContain("When: October 20, 2026 – October 21, 2026\n\nStart time:");
    expect(
      invitationText(
        { ...entry, startTime: "", endTime: "" },
        "https://calendar.example",
      ),
    ).not.toContain("Time zone:");
  });
  it("uses explicit rows and customer groups so email clients do not need whitespace CSS", () => {
    const entry = entryFixtures()[0];
    entry.customers[0].purpose = "First line\nSecond line";
    const html = invitationHtml(entry, "https://calendar.example");
    expect(html).toContain("<td");
    expect(html).toContain("Customer 1 · First customer");
    expect(html).toContain("Customer 2 · Second customer");
    expect(html).toContain("First line<br />Second line");
    expect(html).toContain(
      `href="https://calendar.example/?entry=${entry.id}"`,
    );
    expect(html).not.toContain("white-space:pre-wrap");
    expect(invitationText(entry, "https://calendar.example")).toContain(
      "CUSTOMER 1\nName: First customer\nMeeting purpose:",
    );
  });
  it("escapes entry content and rejects executable agenda links", () => {
    const entry = entryFixtures()[1];
    entry.title = '<img src=x onerror="alert(1)">';
    entry.visitors = "<script>alert(1)</script>";
    entry.agenda = "javascript:alert(1)";
    const html = invitationHtml(entry, "https://calendar.example");
    expect(html).toContain("&lt;img");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain('<img src=x onerror="alert(1)"');
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("javascript:");
  });
  it("includes both tender deadlines and repeated requirements", () => {
    const entry = entryFixtures()[3];
    const html = invitationHtml(entry, "https://calendar.example");
    expect(html).toContain("Pre-submission deadline");
    expect(html).toContain("Call back deadline");
    expect(html).toContain("October 5, 2026");
    expect(html).toContain("October 20, 2026");
    expect(html).toContain("Priority 1");
    expect(html).toContain("Test requirement");
  });
});
