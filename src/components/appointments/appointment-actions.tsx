"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function AppointmentActions({
  appointmentId,
  tenantSlug,
}: {
  appointmentId: string;
  tenantSlug: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function cancel() {
    if (!confirm("Cancel this appointment?")) return;
    setLoading(true);
    try {
      await fetch("/api/appointments/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, reason: "Cancelled by staff" }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={() =>
          router.push(`/t/${tenantSlug}/appointments/${appointmentId}/reschedule`)
        }
      >
        Reschedule
      </Button>
      <Button variant="destructive" size="sm" disabled={loading} onClick={() => void cancel()}>
        Cancel
      </Button>
    </div>
  );
}