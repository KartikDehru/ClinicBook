import { getContainer } from "@/lib/container";
import { apiRoute, parseBody } from "@/lib/http";
import { settingsSchema } from "@/lib/validation/schemas";

export const PATCH = apiRoute<{ id: string }>(async ({ request, actor, params, json }) => {
  const input = await parseBody(request, settingsSchema);
  const tenant = await getContainer().tenantAdmin.updateSettings(actor, params.id, input);
  return json({ tenant });
});
