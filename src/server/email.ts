import { Resend } from "resend";
import type { Entry } from "@/lib/validation";
import {
  invitationHtml,
  invitationSubject,
  invitationText,
} from "@/lib/invitation";
import { capabilities } from "./config";
import { AppError } from "./errors";
import { beginInvitation, finishInvitation } from "./repository";
export async function sendInvitations(entry: Entry, email: string) {
  if (!capabilities().emailSending)
    throw new AppError(
      "Email sending is not configured. Set RESEND_API_KEY and a verified EMAIL_FROM.",
      503,
    );
  if (!entry.emails.length)
    throw new AppError("Add invitation email addresses first.");
  const url = process.env.APP_URL;
  if (!url) throw new AppError("Set APP_URL before sending invitations.", 503);
  const id = await beginInvitation(entry.id, email);
  try {
    const text = invitationText(entry, new URL(url).origin);
    const html = invitationHtml(entry, new URL(url).origin);
    const result = await new Resend(process.env.RESEND_API_KEY!).batch.send(
      entry.emails.map((to) => ({
        from: process.env.EMAIL_FROM!,
        to,
        subject: invitationSubject(entry),
        text,
        html,
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
