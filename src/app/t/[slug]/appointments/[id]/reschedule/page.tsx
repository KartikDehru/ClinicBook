import { notFound, redirect } from "next/navigation";
import { resolveTenantFromRequest } from "@/lib/tenants/resolve-tenant";
import { getAppointmentById } from "@/lib/appointments/service";
import { generateOpenSlots } from "@/lib/availability/slots";
import { RescheduleForm } from "@/components/appointments/reschedule-form";

export default async function ReschedulePage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const tenant = await resolveTenantFromRequest(slug);
  if (!tenant) notFound();

  const appointment = getAppointmentById(id);
  if (!appointment || appointment.tenantId !== tenant.id) notFound();
  if (appointment.status === "cancelled") redirect(`/t/${slug}/appointments`);

  const slots = generateOpenSlots(appointment.providerId, new Date(), 14);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Reschedule</h2>
        <p className="text-slate-600">{appointment.serviceName}</p>
      </div>
      <RescheduleForm appointmentId={appointment.id} slots={slots} tenantSlug={slug} />
    </div>
  );
}