import { getContainer } from "@/lib/container";
import { apiRoute, parseBody } from "@/lib/http";
import { joinWaitlistSchema } from "@/lib/validation/schemas";
import { AppointmentError } from "@/lib/errors";
import { z } from "zod";
import { parseQuery } from "@/lib/http";

export const GET = apiRoute(async ({ request, actor, json }) => {
  const { tenantId } = parseQuery(request, z.object({ tenantId: z.string().min(1) }));
  const entries = await getContainer().waitlist.list(actor, tenantId);
  return json({ entries });
});

export const POST = apiRoute(async ({ request, actor, json }) => {
  const input = await parseBody(request, joinWaitlistSchema);
  if (!actor) throw new AppointmentError("UNAUTHORIZED", "Sign in to join the waitlist.");
  const entry = await getContainer().waitlist.join(actor, input);
  return json({ entry }, { status: 201 });
});
