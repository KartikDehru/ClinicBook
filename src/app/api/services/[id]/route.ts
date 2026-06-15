import { getContainer } from "@/lib/container";
import { apiRoute, parseBody } from "@/lib/http";
import { serviceActiveSchema } from "@/lib/validation/schemas";

export const PATCH = apiRoute<{ id: string }>(async ({ request, actor, params, json }) => {
  const { active } = await parseBody(request, serviceActiveSchema);
  const service = await getContainer().tenantAdmin.setServiceActive(actor, params.id, active);
  return json({ service });
});
