import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { z } from "zod";
import { capabilities, sessionSecret } from "@/server/config";
import { currentPerson, SESSION_COOKIE } from "@/server/session";
import { findAuthorizedPerson } from "@/server/people";
import { signSession } from "@/server/session-token";
import { consumeLimit } from "@/server/repository";
import { endpoint, jsonBody, sameOrigin } from "@/server/http";
import { AppError } from "@/server/errors";
export const runtime = "nodejs";
export async function GET() {
  return endpoint(async () => ({
    person: await currentPerson(),
    ...capabilities(),
  }));
}
export async function POST(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const { email } = z
      .object({ email: z.string().trim().toLowerCase().email().max(254) })
      .parse(await jsonBody(request));
    // Hash unverified inputs; do not retain raw entered addresses in rate-limit keys.
    const source = process.env.NETLIFY
      ? request.headers.get("x-nf-client-connection-ip") || "unknown"
      : "local";
    await consumeLimit(
      `access:${createHash("sha256").update(source).digest("hex")}`,
      30,
      15 * 60 * 1000,
    );
    const person = await findAuthorizedPerson(email);
    if (!person)
      throw new AppError("This email is not on the approved access list.", 403);
    (await cookies()).set(SESSION_COOKIE, signSession(email, sessionSecret()), {
      httpOnly: true,
      secure: (process.env.APP_URL || request.url).startsWith("https://"),
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
    return { person, ...capabilities() };
  });
}
export async function DELETE(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    (await cookies()).delete(SESSION_COOKIE);
    return { ok: true };
  });
}
