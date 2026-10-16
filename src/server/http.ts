import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { currentEmail } from "./session";
import { AppError } from "./errors";
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_URL
    ? new URL(process.env.APP_URL).origin
    : new URL(request.url).origin;
  if (!origin || origin !== expected)
    throw new AppError("Request origin is not allowed.", 403);
}
export async function protect(request: Request, mutating = false) {
  if (mutating) sameOrigin(request);
  const email = await currentEmail();
  if (!email)
    throw new AppError(
      "Your session ended. Please enter your approved email again.",
      401,
    );
  return email;
}
export async function jsonBody(request: Request) {
  const raw = await request.text();
  if (raw.length > 150000) throw new AppError("The form is too large.", 413);
  try {
    return JSON.parse(raw);
  } catch {
    throw new AppError("Invalid request body.");
  }
}
export async function endpoint(action: () => Promise<unknown>) {
  try {
    return NextResponse.json(await action(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json(
        { error: error.issues[0]?.message || "Check the form fields." },
        { status: 400 },
      );
    if (error instanceof AppError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    console.error(
      "Request failed.",
      error instanceof Error ? error.name : "Unknown error",
    );
    return NextResponse.json(
      {
        error:
          "The service is unavailable. Check the server configuration or try again.",
      },
      { status: 503 },
    );
  }
}
