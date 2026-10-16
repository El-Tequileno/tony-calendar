import type { Entry } from "./validation";
import { APP_NAME } from "./brand";
import { CATEGORIES, PROVINCES } from "./constants";
import { formatDay, when } from "./dates";

type Detail = [label: string, value: string];
function escape(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );
}
function lines(value: string) {
  return escape(value).replace(/\r?\n/g, "<br />");
}
function webUrl(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
function entryUrl(entry: Entry, origin: string) {
  const url = webUrl(origin);
  if (!url) throw new Error("A valid calendar URL is required.");
  return new URL(`/?entry=${encodeURIComponent(entry.id)}`, new URL(url).origin)
    .href;
}
function details(entry: Entry): Detail[] {
  return [
    ...(entry.type === "tender"
      ? [
          ["Destination", entry.destination],
          ["Pre-submission deadline", formatDay(entry.preSubmissionDeadline)],
          ["Call back deadline", formatDay(entry.callBackDeadline)],
          ["Price range", entry.priceRange],
        ]
      : [
          ["When", when(entry)],
          ["Province(s)", entry.provinces.map((p) => PROVINCES[p]).join(", ")],
          ["City", entry.city],
          ...(entry.type === "event" ? [] : [["Location", entry.location]]),
          ["Distributor", entry.distributor],
        ]),
    ...(entry.type === "distillery"
      ? [
          ["Customer", entry.customer],
          ["People visiting", entry.visitors],
        ]
      : []),
    ...(entry.type === "event"
      ? [
          ["Venue name", entry.venueName],
          ["Address", entry.address || entry.location],
          ["Postal code", entry.postalCode],
          ["Activation terms", entry.activationTerms],
          ["Names", entry.peopleNames],
          ["Company", entry.company],
          ["Attendance", entry.attendance],
          ["Setup", entry.setup],
          ["Products", entry.products],
          ["Equipment", entry.equipment],
          ["Special Notes", entry.specialNotes],
        ]
      : []),
  ].filter(([, value]) => !!value) as Detail[];
}
export function invitationSubject(entry: Entry) {
  return `${APP_NAME}: ${entry.title}`;
}
export function invitationText(entry: Entry, origin: string) {
  return [
    APP_NAME,
    CATEGORIES[entry.type].singular,
    entry.title,
    ...details(entry).map(([label, value]) => `${label}: ${value}`),
    ...(entry.type === "market"
      ? entry.customers.map(
          (customer, index) =>
            `CUSTOMER ${index + 1}\nName: ${customer.name}\nMeeting purpose: ${customer.purpose || "Not entered"}\nMeeting location: ${customer.location || "Not entered"}`,
        )
      : []),
    ...(entry.type === "tender"
      ? entry.requirements.map(
          (requirement) =>
            `Priority ${requirement.priority}\n${requirement.specification}`,
        )
      : []),
    entry.type === "distillery" && webUrl(entry.agenda)
      ? `Visit agenda: ${webUrl(entry.agenda)}`
      : "",
    `View calendar entry: ${entryUrl(entry, origin)}`,
    "This invitation is informational. No RSVP is requested.",
  ]
    .filter(Boolean)
    .join("\n\n");
}
function rows(items: Detail[]) {
  return items
    .map(
      ([label, value]) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid #e5ebe4;font-size:12px;font-weight:bold;color:#64756c;vertical-align:top;width:35%">${escape(label)}</td><td style="padding:10px 0 10px 14px;border-bottom:1px solid #e5ebe4;font-size:14px;color:#243e36;vertical-align:top;word-break:break-word">${lines(value)}</td></tr>`,
    )
    .join("");
}
function detailTable(items: Detail[]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">${rows(items)}</table>`;
}
function group(title: string, content: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;border:1px solid #e5ebe4;border-radius:8px"><tr><td style="padding:16px"><h2 style="font-size:15px;line-height:1.5;color:#243e36;margin:0 0 8px">${escape(title)}</h2>${content}</td></tr></table>`;
}

// Shared by the sent email and its in-app preview. All entry text is escaped.
export function invitationBodyHtml(entry: Entry, origin: string) {
  const customers =
    entry.type === "market"
      ? entry.customers
          .map((customer, index) =>
            group(
              `Customer ${index + 1} · ${customer.name}`,
              detailTable([
                ["Meeting purpose", customer.purpose || "Not entered"],
                ["Meeting location", customer.location || "Not entered"],
              ]),
            ),
          )
          .join("")
      : "";
  const requirements =
    entry.type === "tender"
      ? entry.requirements
          .map((requirement) =>
            group(
              `Priority ${requirement.priority}`,
              `<p style="margin:0;font-size:14px;color:#243e36;line-height:1.7;word-break:break-word">${lines(requirement.specification)}</p>`,
            ),
          )
          .join("")
      : "";
  const agenda = entry.type === "distillery" ? webUrl(entry.agenda) : null;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f2f5ef;font-family:Arial,Helvetica,sans-serif;line-height:1.6"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border-collapse:collapse;background-color:#ffffff">
<tr><td style="background-color:#233e38;padding:24px;color:#ffffff;font-size:17px;font-weight:bold">${escape(APP_NAME)}</td></tr>
<tr><td style="padding:28px 24px"><p style="margin:0 0 8px;color:#78876e;font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase">${escape(CATEGORIES[entry.type].singular)}</p><h1 style="font-family:Georgia,serif;font-size:28px;line-height:1.25;color:#233e38;margin:0 0 24px;word-break:break-word">${lines(entry.title)}</h1>
${detailTable(details(entry))}${customers}${requirements}
${agenda ? `<p style="margin:24px 0 0"><a href="${escape(agenda)}" target="_blank" rel="noopener noreferrer" style="font-size:14px;color:#326756;text-decoration:underline">Open visit agenda →</a></p>` : ""}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px"><tr><td bgcolor="#233e38" style="border-radius:6px;text-align:center"><a href="${escape(entryUrl(entry, origin))}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:13px 22px;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none">View calendar entry →</a></td></tr></table>
<p style="margin:16px 0 0;font-size:12px;color:#788477">Open the calendar for the latest details.</p></td></tr>
<tr><td style="padding:20px 24px;background-color:#f7f9f4;border-top:1px solid #e5ebe4;font-size:12px;color:#788477">This invitation is informational. No RSVP is requested.</td></tr></table></td></tr></table>`;
}
export function invitationHtml(entry: Entry, origin: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${escape(invitationSubject(entry))}</title></head><body style="margin:0;padding:0;background-color:#f2f5ef">${invitationBodyHtml(entry, origin)}</body></html>`;
}
