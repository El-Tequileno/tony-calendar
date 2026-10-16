import { createHmac, timingSafeEqual } from "node:crypto";
export function signSession(email: string, secret: string, now = Date.now()) {
  const payload = Buffer.from(
    JSON.stringify({ email, expires: now + 7 * 24 * 60 * 60 * 1000 }),
  ).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}
export function readSession(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): string | null {
  if (!token) return null;
  try {
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra) return null;
    const expected = createHmac("sha256", secret).update(payload).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(expected, actual))
      return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof data.email === "string" &&
      typeof data.expires === "number" &&
      data.expires > now
      ? data.email
      : null;
  } catch {
    return null;
  }
}
