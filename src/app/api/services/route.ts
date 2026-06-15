import { z } from "zod";
import { getContainer } from "@/lib/container";
import { apiRoute, parseBody, parseQuery } from "@/lib/http";
import { createServiceSchema } from "@/lib/validation/schemas";

export const GET = apiRoute(async ({ request, actor, json }) => {
  const { tenantId } = parseQuery(request, z.object({ tenantId: z.string().min(1) }));
  return json({ services: await getContainer().tenantAdmin.listServices(actor, tenantId) });
});

export const POST = apiRoute(async ({ request, actor, json }) => {
  const input = await parseBody(request, createServiceSchema);
  const service = await getContainer().tenantAdmin.createService(actor, input);
  return json({ service }, { status: 201 });
});
