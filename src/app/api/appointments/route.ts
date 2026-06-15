import { getContainer } from "@/lib/container";
import { AppointmentError } from "@/lib/errors";
import { apiRoute, parseBody, parseQuery } from "@/lib/http";
import { enforceRateLimit, getLimiters } from "@/lib/rate-limit";
import { appointmentsQuerySchema, bookAppointmentSchema } from "@/lib/validation/schemas";

export const GET = apiRoute(async ({ request, actor, json }) => {
  const query = parseQuery(request, appointmentsQuerySchema);
  const appointments = await getContainer().appointments.list(actor, query);
  return json({ appointments });
});

export const POST = apiRoute(async ({ request, actor, ip, log, json }) => {
  const input = await parseBody(request, bookAppointmentSchema);
  if (!actor) throw new AppointmentError("UNAUTHORIZED", "Sign in to book.");
  enforceRateLimit(getLimiters().booking, `${ip}:${input.tenantId}`);

  const idempotencyKey = request.headers.get("idempotency-key") ?? undefined;
  const { appointment, replayed } = await getContainer().appointments.book(actor, input, {
    idempotencyKey,
  });
  log.info("appointment booked", { appointmentId: appointment.id, replayed });
  return json(
    { appointment, replayed },
    {
      status: replayed ? 200 : 201,
      headers: replayed ? { "idempotent-replayed": "true" } : undefined,
    }
  );
});
