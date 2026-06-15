import { getContainer } from "@/lib/container";
import { apiRoute } from "@/lib/http";

export const DELETE = apiRoute<{ id: string }>(async ({ actor, params, json }) => {
  const entry = await getContainer().waitlist.remove(actor, params.id);
  return json({ entry });
});
