import { redirect } from "next/navigation";
import { currentPerson } from "@/server/session";
import { capabilities } from "@/server/config";
import { Workspace } from "@/features/calendar/workspace";
export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ entry?: string }>;
}) {
  const query = await searchParams;
  const entryId =
    typeof query.entry === "string" && /^[0-9a-f-]{36}$/i.test(query.entry)
      ? query.entry
      : undefined;
  const accessPath = entryId ? `/login?entry=${entryId}` : "/login";
  let person: Awaited<ReturnType<typeof currentPerson>> = null;
  try {
    person = await currentPerson();
  } catch {
    redirect(accessPath);
  }
  if (!person) redirect(accessPath);
  return (
    <Workspace
      email={person.email}
      isTony={person.isTony}
      capabilities={capabilities()}
      initialEntryId={entryId}
    />
  );
}
