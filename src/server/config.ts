export function demoMode() {
  return (
    process.env.DEMO_MODE === "true" ||
    (!process.env.DATABASE_URL &&
      process.env.NODE_ENV !== "production" &&
      process.env.DEMO_MODE !== "false")
  );
}
export function approvedEmails() {
  return (
    process.env.APPROVED_EMAILS ||
    (demoMode() ? "tony@example.com,distributor@example.com" : "")
  )
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}
export function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (demoMode())
    return "local-demo-session-key-only-not-for-real-records-2026";
  throw new Error(
    "Set SESSION_SECRET to a random value of at least 32 characters.",
  );
}
export function capabilities() {
  return {
    demo: demoMode(),
    emailSending:
      !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM && !demoMode(),
    uploads:
      (!!process.env.NETLIFY || process.env.NODE_ENV === "development") &&
      !demoMode(),
  };
}
