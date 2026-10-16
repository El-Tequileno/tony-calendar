import { cookies } from "next/headers";
import { approvedEmails, sessionSecret } from "./config";
import { readSession } from "./session-token";
export const SESSION_COOKIE = "tony-calendar-session";
export async function currentEmail() {
  return readSession(
    (await cookies()).get(SESSION_COOKIE)?.value,
    sessionSecret(),
    approvedEmails(),
  );
}
