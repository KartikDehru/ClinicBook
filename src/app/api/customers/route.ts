import { z } from "zod";
import { getContainer } from "@/lib/container";
import { apiRoute, parseBody, parseQuery } from "@/lib/http";
import { createCustomerSchema } from "@/lib/validation/schemas";

export const GET = apiRoute(async ({ request, actor, json }) => {
  const { tenantId } = parseQuery(request, z.object({ tenantId: z.string().min(1) }));
  return json({ customers: await getContainer().customers.list(actor, tenantId) });
});

export const POST = apiRoute(async ({ request, actor, json }) => {
  const input = await parseBody(request, createCustomerSchema);
  const customer = await getContainer().customers.create(actor, input);
  return json({ customer }, { status: 201 });
});
