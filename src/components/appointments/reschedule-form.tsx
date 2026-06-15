"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import type { SlotOption } from "@/lib/availability";
import { Alert } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { SlotPicker } from "@/components/booking/slot-picker";

export function RescheduleForm({
  appointmentId,
  slots,
  timezoneLabel,
  returnTo,
}: {
  appointmentId: string;
  slots: SlotOption[];
  timezoneLabel: string;
  returnTo: string;
}) {
  const router = useRouter();
  const [startsAt, setStartsAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        json: { action: "reschedule", startsAt },
      });
      router.push(returnTo);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Could not reschedule");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <SlotPicker slots={slots} value={startsAt} onChange={setStartsAt} timezoneLabel={timezoneLabel} />
      {error && <Alert>{error}</Alert>}
      <Button disabled={!startsAt || loading} onClick={() => void submit()}>
        {loading ? "Saving…" : "Confirm new time"}
      </Button>
    </div>
  );
}
