"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TimeSlotOption } from "@/lib/availability/slots";
import { SlotPicker } from "@/components/booking/slot-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function RescheduleForm({
  appointmentId,
  slots,
  tenantSlug,
}: {
  appointmentId: string;
  slots: TimeSlotOption[];
  tenantSlug: string;
}) {
  const router = useRouter();
  const [startsAt, setStartsAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!startsAt) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/appointments/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, startsAt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      router.push(`/t/${tenantSlug}/appointments`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <SlotPicker slots={slots} value={startsAt} onChange={setStartsAt} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button disabled={!startsAt || loading} onClick={() => void submit()} className="w-full">
          {loading ? "Saving…" : "Confirm new time"}
        </Button>
      </CardContent>
    </Card>
  );
}