import { getContainer } from "@/lib/container";
import { apiRoute, parseBody } from "@/lib/http";
import { appointmentActionSchema } from "@/lib/validation/schemas";

export const GET = apiRoute<{ id: string }>(async ({ actor, params, json }) => {
  const appointment = await getContainer().appointments.get(actor, params.id);
  return json({ appointment });
});

export const PATCH = apiRoute<{ id: string }>(async ({ request, actor, params, json }) => {
  const body = await parseBody(request, appointmentActionSchema);
  const svc = getContainer().appointments;
  const appointment =
    body.action === "reschedule"
      ? await svc.reschedule(actor, params.id, body.startsAt)
      : await svc.transition(actor, params.id, body.action, {
          reason: body.action === "cancel" ? body.reason : undefined,
        });
  return json({ appointment });
});
