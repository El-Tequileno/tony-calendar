import { Resend } from "resend";
import type { Entry } from "@/lib/validation";
import { when } from "@/lib/dates";
import { CATEGORIES, PROVINCES } from "@/lib/constants";
import { capabilities } from "./config";
import { AppError } from "./errors";
import { beginInvitation, finishInvitation } from "./repository";
function escape(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export function invitationText(entry: Entry, url: string) {
  return [
    CATEGORIES[entry.type].singular,
    entry.title,
    when(entry),
    entry.type === "tender"
      ? `Destination(s): ${entry.destination}`
      : `Province(s): ${entry.provinces.map((p) => PROVINCES[p]).join(", ")}`,
    entry.city && `City: ${entry.city}`,
    entry.location && `Location: ${entry.location}`,
    ...(entry.type === "market"
      ? entry.customers.map(
          (c) =>
            `Customer: ${c.name}\nMeeting purpose: ${c.purpose}\nMeeting location: ${c.location}`,
        )
      : []),
    entry.type === "distillery" &&
      entry.agenda &&
      `Visit agenda: ${entry.agenda}`,
    entry.type === "event" &&
      `Activation terms: ${entry.activationTerms}\nNames: ${entry.peopleNames}\nCompany: ${entry.company}`,
    `View calendar entry: ${url}/?entry=${entry.id}`,
    "This invitation is informational. No RSVP is requested.",
  ]
    .filter(Boolean)
    .join("\n\n");
}
export async function sendInvitations(entry: Entry, email: string) {
  if (!capabilities().emailSending)
    throw new AppError(
      "Email sending is not configured. Set RESEND_API_KEY and a verified EMAIL_FROM, and disable demo mode.",
      503,
    );
  if (!entry.emails.length)
    throw new AppError("Add invitation email addresses first.");
  const url = process.env.APP_URL;
  if (!url) throw new AppError("Set APP_URL before sending invitations.", 503);
  const id = await beginInvitation(entry.id, email);
  try {
    const text = invitationText(entry, new URL(url).origin);
    const result = await new Resend(process.env.RESEND_API_KEY!).batch.send(
      entry.emails.map((to) => ({
        from: process.env.EMAIL_FROM!,
        to,
        subject: `Calendar invitation: ${entry.title}`,
        text,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.6;white-space:pre-wrap">${escape(text)}</div>`,
      })),
      { idempotencyKey: id },
    );
    if (result.error) throw new Error("Email provider rejected the request.");
    await finishInvitation(
      id,
      "accepted",
      result.data?.data.map((row) => row.id).join(","),
    );
    return {
      message:
        "Invitations accepted by the email provider. Delivery may take a moment.",
    };
  } catch {
    await finishInvitation(id, "failed");
    throw new AppError(
      "The email provider could not send the invitations. Check the sender configuration and try again.",
      502,
    );
  }
}
