import { endpoint, jsonBody, protectTony } from "@/server/http";
import { listPeople, addPerson, updatePerson } from "@/server/people";
import { addPersonSchema, updatePersonSchema } from "@/lib/people";
import { consumeLimit } from "@/server/repository";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return endpoint(async () => {
    await protectTony(request);
    return { people: await listPeople() };
  });
}
export async function POST(request: Request) {
  return endpoint(async () => {
    const tony = await protectTony(request, true);
    await consumeLimit(`people:${tony.email}`, 30, 60000);
    return {
      person: await addPerson(addPersonSchema.parse(await jsonBody(request))),
    };
  });
}
export async function PATCH(request: Request) {
  return endpoint(async () => {
    const tony = await protectTony(request, true);
    await consumeLimit(`people:${tony.email}`, 30, 60000);
    const input = updatePersonSchema.parse(await jsonBody(request));
    return {
      person: await updatePerson(input.email, {
        active: input.active,
        permission: input.permission,
      }),
    };
  });
}
