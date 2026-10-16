import { describe, expect, it } from "vitest";
import { invitationHtml, invitationText } from "../src/lib/invitation";
import { entryFixtures } from "./fixtures";

describe("invitation email formatting", () => {
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
    expect(html).not.toContain("<img");
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
