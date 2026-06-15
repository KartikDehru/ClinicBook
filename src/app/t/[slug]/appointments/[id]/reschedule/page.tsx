import { notFound } from "next/navigation";
import { AccessGate } from "@/components/layout/access-gate";
import { RescheduleForm } from "@/components/appointments/reschedule-form";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { loadTenantPage } from "@/lib/auth/page-guard";
import { getContainer } from "@/lib/container";
import { isAppointmentError } from "@/lib/errors";
import { formatInZone, shortZoneName } from "@/lib/time";

export default async function ReschedulePage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const ctx = await loadTenantPage(slug, "appointment:read");
  if (!ctx.ok) return <AccessGate ctx={ctx} path={`/t/${slug}/appointments/${id}/reschedule`} />;
  const { tenant, actor } = ctx;
  const c = getContainer();

  let appointment;
  try {
    appointment = await c.appointments.get(actor, id);
  } catch (err) {
    if (isAppointmentError(err)) notFound();
    throw err;
  }
  if (appointment.tenantId !== tenant.id) notFound();

  const { slots } = await c.appointments.slots(actor, {
    tenantId: tenant.id,
    providerId: appointment.providerId,
    serviceId: appointment.serviceId,
    days: 28,
  });
  const tz = tenant.timezone;

  return (
    <>
      <PageHeader
        title="Reschedule"
        description={`${appointment.serviceName} · currently ${formatInZone(new Date(appointment.startsAt), tz, "full")}`}
      />
      <Card className="max-w-2xl">
        <CardBody>
          <RescheduleForm
            appointmentId={id}
            slots={slots}
            timezoneLabel={`${tz.replace("_", " ")} (${shortZoneName(new Date(), tz)})`}
            returnTo={`/t/${slug}/appointments`}
          />
        </CardBody>
      </Card>
    </>
  );
}
