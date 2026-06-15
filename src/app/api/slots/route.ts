import { getContainer } from "@/lib/container";
import { apiRoute, parseQuery } from "@/lib/http";
import { slotsQuerySchema } from "@/lib/validation/schemas";

export const GET = apiRoute(async ({ request, actor, json }) => {
  const q = parseQuery(request, slotsQuerySchema);
  const result = await getContainer().appointments.slots(actor, q);
  return json(result);
});
