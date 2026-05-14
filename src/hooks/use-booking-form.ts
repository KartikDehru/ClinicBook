"use client";

import { useCallback, useState } from "react";

export interface BookingFormState {
  providerId: string;
  customerId: string;
  startsAt: string;
  serviceName: string;
  notes: string;
}

const initial: BookingFormState = {
  providerId: "",
  customerId: "",
  startsAt: "",
  serviceName: "",
  notes: "",
};

export function useBookingForm() {
  const [form, setForm] = useState<BookingFormState>(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const update = useCallback((patch: Partial<BookingFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => {
    setForm(initial);
    setError(null);
  }, []);

  const submit = useCallback(
    async (tenantId: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, tenantId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Booking failed");
        reset();
        return data.appointment;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [form, reset]
  );

  return { form, update, submit, error, loading, reset };
}