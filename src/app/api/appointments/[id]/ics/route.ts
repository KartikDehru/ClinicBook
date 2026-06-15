import { getContainer } from "@/lib/container";
import { buildIcs } from "@/lib/ics";
import { apiRoute } from "@/lib/http";

export const GET = apiRoute<{ id: string }>(async ({ actor, params }) => {
  const c = getContainer();
  const appt = await c.appointments.get(actor, params.id);
  const [tenant, provider] = await Promise.all([
    c.repos.tenants.get(appt.tenantId),
    c.repos.providers.get(appt.providerId),
  ]);
  const body = buildIcs({
    uid: appt.id,
    title: `${appt.serviceName} at ${tenant?.name ?? "ClinicBook"}`,
    description: `With ${provider?.name ?? "your provider"}. ${tenant?.cancellationPolicy ?? ""}`.trim(),
    location: tenant?.name,
    startsAt: appt.startsAt,
    endsAt: appt.endsAt,
    organizerName: tenant?.name,
    organizerEmail: "bookings@clinicbook.app",
  });
  return new Response(body, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="appointment-${appt.id}.ics"`,
    },
  });
});
