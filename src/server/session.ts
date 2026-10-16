import { cookies } from "next/headers";
import { sessionSecret } from "./config";
import { readSession } from "./session-token";
import { findAuthorizedPerson } from "./people";
export const SESSION_COOKIE = "tony-calendar-session";
export async function currentPerson() {
  const email = readSession(
    (await cookies()).get(SESSION_COOKIE)?.value,
    sessionSecret(),
  );
  return email ? findAuthorizedPerson(email) : null;
}
export async function currentEmail() {
  return (await currentPerson())?.email ?? null;
}
