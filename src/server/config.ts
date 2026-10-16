import { uploadsEnabled } from "./upload-config";
export function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  throw new Error(
    "Set SESSION_SECRET to a random value of at least 32 characters.",
  );
}
export function capabilities() {
  return {
    emailSending: !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM,
    uploads: uploadsEnabled(),
  };
}
