import { z } from "zod";
import { getContainer } from "@/lib/container";
import { apiRoute, parseQuery } from "@/lib/http";

export const GET = apiRoute(async ({ request, actor, json }) => {
  const q = parseQuery(
    request,
    z.object({
      tenantId: z.string().min(1),
      entityId: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(200).optional(),
    })
  );
  const entries = await getContainer().audit.list(actor, q.tenantId, {
    entityId: q.entityId,
    limit: q.limit ?? 50,
  });
  return json({ entries });
});
