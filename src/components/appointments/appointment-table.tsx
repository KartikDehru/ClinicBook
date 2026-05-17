"use client";

import { format } from "date-fns";
import type { Appointment, Customer, Provider } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppointmentActions } from "@/components/appointments/appointment-actions";

const statusVariant: Record<Appointment["status"], "default" | "success" | "warning" | "muted"> = {
  scheduled: "muted",
  confirmed: "default",
  completed: "success",
  cancelled: "warning",
  no_show: "warning",
};

interface AppointmentTableProps {
  appointments: Appointment[];
  providers: Provider[];
  customers: Customer[];
  canManage: boolean;
  tenantSlug: string;
}

export function AppointmentTable({
  appointments,
  providers,
  customers,
  canManage,
  tenantSlug,
}: AppointmentTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">When</th>
            <th className="px-4 py-3 font-medium">Service</th>
            <th className="px-4 py-3 font-medium">Provider</th>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Status</th>
            {canManage && <th className="px-4 py-3 font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {appointments.map((apt) => {
            const provider = providers.find((p) => p.id === apt.providerId);
            const customer = customers.find((c) => c.id === apt.customerId);
            return (
              <tr key={apt.id} className="border-t border-slate-100">
                <td className="px-4 py-3 whitespace-nowrap">
                  {format(new Date(apt.startsAt), "MMM d, h:mm a")}
                </td>
                <td className="px-4 py-3">{apt.serviceName}</td>
                <td className="px-4 py-3">{provider?.name ?? "—"}</td>
                <td className="px-4 py-3">{customer?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant[apt.status]} className="capitalize">
                    {apt.status.replace("_", " ")}
                  </Badge>
                </td>
                {canManage && (
                  <td className="px-4 py-3">
                    {apt.status !== "cancelled" ? (
                      <AppointmentActions appointmentId={apt.id} tenantSlug={tenantSlug} />
                    ) : (
                      <Button variant="ghost" size="sm" disabled>
                        —
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}