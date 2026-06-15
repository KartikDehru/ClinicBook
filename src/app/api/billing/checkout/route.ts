import { getContainer } from "@/lib/container";
import { AppointmentError } from "@/lib/errors";
import { apiRoute, parseBody } from "@/lib/http";
import { enforceRateLimit, getLimiters } from "@/lib/rate-limit";
import { checkoutSchema } from "@/lib/validation/schemas";

export const POST = apiRoute(async ({ request, actor, ip, json }) => {
  const input = await parseBody(request, checkoutSchema);
  if (!actor) throw new AppointmentError("UNAUTHORIZED", "Sign in to manage billing.");
  enforceRateLimit(getLimiters().checkout, `${ip}:${input.tenantId}`);
  const session = await getContainer().billing.createCheckout(actor, input.tenantId, input.plan);
  return json(session);
});
