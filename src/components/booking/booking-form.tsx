"use client";

import type { Customer, Provider } from "@/types";
import { useBookingForm } from "@/hooks/use-booking-form";
import type { TimeSlotOption } from "@/lib/availability/slots";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SlotPicker } from "@/components/booking/slot-picker";
import { ProviderCard } from "@/components/booking/provider-card";

interface BookingFormProps {
  tenantId: string;
  providers: Provider[];
  customers: Customer[];
  slotsByProvider: Record<string, TimeSlotOption[]>;
  defaultServiceName?: string;
}

export function BookingForm({
  tenantId,
  providers,
  customers,
  slotsByProvider,
  defaultServiceName = "Consultation",
}: BookingFormProps) {
  const { form, update, submit, error, loading } = useBookingForm();

  const provider = providers.find((p) => p.id === form.providerId);
  const slots = form.providerId ? slotsByProvider[form.providerId] ?? [] : [];

  return (
  <div className="grid gap-6 lg:grid-cols-2">
    <Card>
      <CardHeader>
        <CardTitle>1. Choose provider</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {providers.map((p) => (
          <ProviderCard
            key={p.id}
            provider={p}
            selected={form.providerId === p.id}
            onSelect={() => update({ providerId: p.id, startsAt: "" })}
          />
        ))}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>2. Details & time</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          Customer
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            value={form.customerId}
            onChange={(e) => update({ customerId: e.target.value })}
          >
            <option value="">Select customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Service
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            value={form.serviceName || defaultServiceName}
            onChange={(e) => update({ serviceName: e.target.value })}
          />
        </label>

        {provider && (
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Available slots</p>
            <SlotPicker
              slots={slots}
              value={form.startsAt}
              onChange={(startsAt) => update({ startsAt })}
            />
          </div>
        )}

        <label className="block text-sm font-medium text-slate-700">
          Notes
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            rows={3}
            value={form.notes}
            onChange={(e) => update({ notes: e.target.value })}
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button
          type="button"
          disabled={loading || !form.providerId || !form.customerId || !form.startsAt}
          onClick={() => void submit(tenantId)}
          className="w-full"
        >
          {loading ? "Booking…" : "Confirm booking"}
        </Button>
      </CardContent>
    </Card>
  </div>
  );
}