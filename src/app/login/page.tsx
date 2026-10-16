import { redirect } from "next/navigation";
import { AccessForm } from "@/features/access/access-form";
import { currentEmail } from "@/server/session";
export const dynamic = "force-dynamic";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ entry?: string }>;
}) {
  const query = await searchParams;
  const entryId =
    typeof query.entry === "string" && /^[0-9a-f-]{36}$/i.test(query.entry)
      ? query.entry
      : undefined;
  let email: string | null = null;
  try {
    email = await currentEmail();
  } catch {}
  if (email) redirect(entryId ? `/?entry=${entryId}` : "/");
  return <AccessForm entryId={entryId} />;
}
