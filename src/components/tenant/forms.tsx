"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

function useSubmit(action: () => Promise<void>, onDone?: () => void) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  return {
    busy,
    error,
    ok,
    async run() {
      setBusy(true);
      setError(null);
      setOk(false);
      try {
        await action();
        setOk(true);
        onDone?.();
        router.refresh();
      } catch (e) {
        setError(e instanceof ApiClientError ? e.message : "Something went wrong");
      } finally {
        setBusy(false);
      }
    },
  };
}

export function CreateCustomerForm({ tenantId }: { tenantId: string }) {
  const [v, setV] = useState({ name: "", email: "", phone: "", notes: "" });
  const s = useSubmit(
    () => apiFetch("/api/customers", { method: "POST", json: { tenantId, ...v, phone: v.phone || undefined, notes: v.notes || undefined } }),
    () => setV({ name: "", email: "", phone: "", notes: "" })
  );
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void s.run();
      }}
    >
      <Field label="Full name">
        <Input required minLength={2} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
      </Field>
      <Field label="Email">
        <Input required type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
      </Field>
      <Field label="Phone">
        <Input type="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
      </Field>
      <Field label="Notes">
        <Textarea rows={2} maxLength={500} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />
      </Field>
      {s.error && <Alert>{s.error}</Alert>}
      {s.ok && <Alert tone="success">Customer added.</Alert>}
      <Button type="submit" disabled={s.busy}>
        {s.busy ? "Adding…" : "Add customer"}
      </Button>
    </form>
  );
}

export function CreateServiceForm({
  tenantId,
  providers,
}: {
  tenantId: string;
  providers: { id: string; name: string }[];
}) {
  const initial = { name: "", description: "", durationMinutes: "30", price: "", providerId: "" };
  const [v, setV] = useState(initial);
  const s = useSubmit(
    () =>
      apiFetch("/api/services", {
        method: "POST",
        json: {
          tenantId,
          name: v.name,
          description: v.description || undefined,
          durationMinutes: Number(v.durationMinutes),
          priceCents: Math.round(Number(v.price || 0) * 100),
          providerIds: v.providerId ? [v.providerId] : [],
        },
      }),
    () => setV(initial)
  );
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void s.run();
      }}
    >
      <Field label="Service name">
        <Input required minLength={2} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
      </Field>
      <Field label="Description">
        <Input maxLength={240} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Duration">
          <Select value={v.durationMinutes} onChange={(e) => setV({ ...v, durationMinutes: e.target.value })}>
            {[15, 30, 45, 60, 90, 120].map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Price">
          <Input required type="number" min="0" step="0.01" value={v.price} onChange={(e) => setV({ ...v, price: e.target.value })} />
        </Field>
      </div>
      <Field label="Offered by">
        <Select value={v.providerId} onChange={(e) => setV({ ...v, providerId: e.target.value })}>
          <option value="">Every provider</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      {s.error && <Alert>{s.error}</Alert>}
      {s.ok && <Alert tone="success">Service added.</Alert>}
      <Button type="submit" disabled={s.busy}>
        {s.busy ? "Adding…" : "Add service"}
      </Button>
    </form>
  );
}

export function ServiceToggle({ serviceId, active }: { serviceId: string; active: boolean }) {
  const s = useSubmit(() => apiFetch(`/api/services/${serviceId}`, { method: "PATCH", json: { active: !active } }));
  return (
    <Button size="sm" variant="ghost" disabled={s.busy} onClick={() => void s.run()}>
      {active ? "Archive" : "Restore"}
    </Button>
  );
}

export function InviteStaffForm({ tenantId, disabledReason }: { tenantId: string; disabledReason?: string }) {
  const [v, setV] = useState({ name: "", email: "" });
  const s = useSubmit(
    () => apiFetch("/api/staff", { method: "POST", json: { tenantId, ...v } }),
    () => setV({ name: "", email: "" })
  );
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void s.run();
      }}
    >
      {disabledReason && <Alert tone="info">{disabledReason}</Alert>}
      <Field label="Name">
        <Input required minLength={2} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
      </Field>
      <Field label="Work email">
        <Input required type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
      </Field>
      {s.error && <Alert>{s.error}</Alert>}
      {s.ok && <Alert tone="success">Invitation sent.</Alert>}
      <Button type="submit" disabled={s.busy}>
        {s.busy ? "Inviting…" : "Invite staff member"}
      </Button>
    </form>
  );
}

export function RemoveWaitlistButton({ entryId }: { entryId: string }) {
  const s = useSubmit(() => apiFetch(`/api/waitlist/${entryId}`, { method: "DELETE" }));
  return (
    <Button size="sm" variant="ghost" disabled={s.busy} onClick={() => void s.run()}>
      Remove
    </Button>
  );
}
