"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarPlus, Check, Loader2 } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import type { SlotOption } from "@/lib/availability";
import { buildIcs } from "@/lib/ics";
import { format12h, formatInZone, formatLocalDate } from "@/lib/time";
import { cn, formatMoney } from "@/lib/utils";
import type { Appointment, Customer, Provider, Service, UserRole } from "@/types";
import { SlotPicker } from "@/components/booking/slot-picker";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

interface Props {
  tenant: {
    id: string;
    slug: string;
    name: string;
    timezone: string;
    cancellationPolicy: string;
    waitlistEnabled: boolean;
  };
  services: Service[];
  providers: Provider[];
  customers: Customer[];
  role: UserRole;
  actorName: string;
}

type Phase = "form" | "pending" | "confirmed";

export function BookingFlow({ tenant, services, providers, customers, role, actorName }: Props) {
  const isClient = role === "client";
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [providerId, setProviderId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [notes, setNotes] = useState("");

  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [slotsVersion, setSlotsVersion] = useState(0);
  const [pickedDate, setPickedDate] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [booked, setBooked] = useState<Appointment | null>(null);
  const [waitlisted, setWaitlisted] = useState<string | null>(null);

  const service = services.find((s) => s.id === serviceId);
  const eligibleProviders = useMemo(
    () => providers.filter((p) => !service || service.providerIds.length === 0 || service.providerIds.includes(p.id)),
    [providers, service]
  );
  const provider = providers.find((p) => p.id === providerId);
  const slot = slots.find((s) => s.startsAt === startsAt);

  // Default the provider when the service changes.
  useEffect(() => {
    if (!eligibleProviders.some((p) => p.id === providerId)) {
      setProviderId(eligibleProviders[0]?.id ?? "");
      setStartsAt("");
    }
  }, [eligibleProviders, providerId]);

  // Load slots for the chosen service + provider.
  useEffect(() => {
    if (!serviceId || !providerId) {
      setSlots([]);
      return;
    }
    const ctrl = new AbortController();
    setSlotsLoading(true);
    setSlotsError(null);
    const q = new URLSearchParams({ tenantId: tenant.id, providerId, serviceId, days: "28" });
    apiFetch<{ slots: SlotOption[] }>(`/api/slots?${q}`, { signal: ctrl.signal })
      .then((r) => setSlots(r.slots))
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        setSlotsError(e instanceof ApiClientError ? e.message : "Could not load availability");
      })
      .finally(() => !ctrl.signal.aborted && setSlotsLoading(false));
    return () => ctrl.abort();
  }, [tenant.id, serviceId, providerId, slotsVersion]);

  // One idempotency key per distinct booking payload, so retries and double-clicks are safe.
  const keyRef = useRef<{ sig: string; key: string } | null>(null);
  function idempotencyKey(sig: string): string {
    if (!keyRef.current || keyRef.current.sig !== sig) {
      keyRef.current = { sig, key: `bk_${crypto.randomUUID()}` };
    }
    return keyRef.current.key;
  }

  const ready = !!service && !!provider && !!startsAt && (isClient || !!customerId);

  async function submit() {
    if (!ready || !service || !provider) return;
    setError(null);
    setPhase("pending");
    const payload = {
      tenantId: tenant.id,
      providerId,
      serviceId,
      customerId: isClient ? undefined : customerId,
      startsAt,
      notes: notes.trim() || undefined,
    };
    try {
      const res = await apiFetch<{ appointment: Appointment }>("/api/appointments", {
        method: "POST",
        json: payload,
        idempotencyKey: idempotencyKey(JSON.stringify(payload)),
      });
      setBooked(res.appointment);
      setPhase("confirmed");
    } catch (e) {
      // Roll the optimistic confirmation back and surface the structured error.
      const err = e instanceof ApiClientError ? e : null;
      setError({ code: err?.code ?? "INTERNAL", message: err?.message ?? "Booking failed. Please try again." });
      if (err?.code === "SLOT_TAKEN") {
        setStartsAt("");
        setSlotsVersion((v) => v + 1);
      }
      setPhase("form");
    }
  }

  async function joinWaitlist(desiredDate: string, note: string) {
    setError(null);
    try {
      await apiFetch("/api/waitlist", {
        method: "POST",
        json: {
          tenantId: tenant.id,
          providerId,
          serviceId,
          customerId: isClient ? undefined : customerId || undefined,
          desiredDate,
          note: note || undefined,
        },
      });
      setWaitlisted(desiredDate);
    } catch (e) {
      setError({ code: e instanceof ApiClientError ? e.code : "INTERNAL", message: e instanceof Error ? e.message : "Could not join waitlist" });
    }
  }

  function reset() {
    setBooked(null);
    setStartsAt("");
    setNotes("");
    setError(null);
    setWaitlisted(null);
    setPhase("form");
    setSlotsVersion((v) => v + 1);
    keyRef.current = null;
  }

  if (phase !== "form" && service && provider && (slot || booked)) {
    return (
      <Confirmation
        pending={phase === "pending"}
        tenant={tenant}
        service={service}
        provider={provider}
        startsAt={booked?.startsAt ?? slot!.startsAt}
        endsAt={booked?.endsAt ?? slot!.endsAt}
        booked={booked}
        onReset={reset}
      />
    );
  }

  const customerName = customers.find((c) => c.id === customerId)?.name;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="space-y-10">
        <Step n={1} title="Service">
          <div role="radiogroup" aria-label="Service" className="divide-y divide-ink-100 overflow-hidden rounded-lg border border-ink-200 bg-white">
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={serviceId === s.id}
                onClick={() => {
                  setServiceId(s.id);
                  setStartsAt("");
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors",
                  serviceId === s.id ? "bg-clinic-50" : "hover:bg-ink-50"
                )}
              >
                <span className="flex items-start gap-3">
                  <Radio checked={serviceId === s.id} />
                  <span>
                    <span className="block font-bold text-ink-900">{s.name}</span>
                    <span className="block text-sm text-ink-500">
                      {s.durationMinutes} min{s.description ? ` · ${s.description}` : ""}
                    </span>
                  </span>
                </span>
                <span className="font-semibold tabular-nums text-ink-900">{formatMoney(s.priceCents, s.currency)}</span>
              </button>
            ))}
          </div>
        </Step>

        <Step n={2} title="Provider">
          <div role="radiogroup" aria-label="Provider" className="grid gap-3 sm:grid-cols-2">
            {eligibleProviders.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={providerId === p.id}
                onClick={() => {
                  setProviderId(p.id);
                  setStartsAt("");
                }}
                className={cn(
                  "rounded-lg border px-4 py-3 text-left transition-colors",
                  providerId === p.id ? "border-clinic-700 bg-clinic-50" : "border-ink-200 bg-white hover:border-clinic-500"
                )}
              >
                <span className="block font-bold text-ink-900">{p.name}</span>
                <span className="block text-sm text-ink-500">{p.title}</span>
              </button>
            ))}
          </div>
        </Step>

        <Step n={3} title="Date and time">
          {slotsLoading ? (
            <p className="flex items-center gap-2 text-sm text-ink-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking availability…
            </p>
          ) : slotsError ? (
            <Alert>{slotsError}</Alert>
          ) : (
            <SlotPicker
              slots={slots}
              value={startsAt}
              onChange={setStartsAt}
              onDateChange={setPickedDate}
              timezoneLabel={tenant.timezone.replace("_", " ")}
              emptyHint="This provider has no openings in the next four weeks."
            />
          )}
          {tenant.waitlistEnabled && provider && !slotsLoading && (
            <WaitlistPanel
              key={`${providerId}-${serviceId}`}
              defaultDate={pickedDate}
              joined={waitlisted}
              highlight={error?.code === "SLOT_TAKEN" || slots.length === 0}
              onJoin={joinWaitlist}
            />
          )}
        </Step>

        <Step n={4} title="Details">
          <div className="space-y-4">
            {isClient ? (
              <p className="text-sm text-ink-600">
                Booking as <strong className="text-ink-900">{actorName}</strong>
              </p>
            ) : (
              <Field label="Customer">
                <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">Select a customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.email}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Notes for the team" hint="Optional">
              <Textarea rows={3} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
        </Step>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-lg border border-ink-200 bg-white p-5 shadow-panel">
          <h2 className="font-display text-xl font-semibold text-ink-900">Your booking</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Service" value={service?.name} />
            <Row label="Provider" value={provider?.name} />
            <Row
              label="When"
              value={slot ? `${formatLocalDate(slot.localDate, { weekday: "short", month: "short", day: "numeric" })}, ${format12h(slot.localTime)}` : undefined}
            />
            {!isClient && <Row label="Customer" value={customerName} />}
            <Row label="Price" value={service ? formatMoney(service.priceCents, service.currency) : undefined} />
          </dl>
          {error && (
            <Alert className="mt-4">
              {error.message}
              {error.code === "SLOT_TAKEN" && " The list has been refreshed."}
            </Alert>
          )}
          <Button className="mt-5 w-full" size="lg" disabled={!ready} onClick={() => void submit()}>
            Confirm booking
          </Button>
          <p className="mt-4 text-xs leading-relaxed text-ink-500">{tenant.cancellationPolicy}</p>
        </div>
      </aside>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-baseline gap-3">
        <span className="font-display text-lg text-clinic-600">{String(n).padStart(2, "0")}</span>
        <span className="text-lg font-bold text-ink-900">{title}</span>
      </h2>
      {children}
    </section>
  );
}

function Radio({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
        checked ? "border-clinic-700" : "border-ink-300"
      )}
    >
      {checked && <span className="h-2 w-2 rounded-full bg-clinic-700" />}
    </span>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-400">{label}</dt>
      <dd className={cn("text-right font-semibold", value ? "text-ink-900" : "text-ink-300")}>{value ?? "Not chosen"}</dd>
    </div>
  );
}

function WaitlistPanel({
  defaultDate,
  joined,
  highlight,
  onJoin,
}: {
  defaultDate: string | null;
  joined: string | null;
  highlight: boolean;
  onJoin: (date: string, note: string) => Promise<void>;
}) {
  const [date, setDate] = useState(defaultDate ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (joined) {
    return (
      <Alert tone="success" className="mt-4">
        You&apos;re on the waitlist for {formatLocalDate(joined, { weekday: "long", month: "long", day: "numeric" })}. We&apos;ll email you
        if a time opens.
      </Alert>
    );
  }
  return (
    <details open={highlight} className="mt-4 rounded-md border border-ink-200 bg-white">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-ink-900">
        Don&apos;t see a time that works? Join the waitlist
      </summary>
      <div className="grid gap-3 border-t border-ink-100 p-4 sm:grid-cols-[180px_1fr_auto] sm:items-end">
        <Field label="Preferred day">
          <Input type="date" value={date || defaultDate || ""} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Note">
          <Input value={note} maxLength={300} placeholder="e.g. mornings only" onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Button
          variant="outline"
          disabled={busy || !(date || defaultDate)}
          onClick={async () => {
            setBusy(true);
            await onJoin(date || defaultDate || "", note);
            setBusy(false);
          }}
        >
          Join waitlist
        </Button>
      </div>
    </details>
  );
}

function Confirmation({
  pending,
  tenant,
  service,
  provider,
  startsAt,
  endsAt,
  booked,
  onReset,
}: {
  pending: boolean;
  tenant: Props["tenant"];
  service: Service;
  provider: Provider;
  startsAt: string;
  endsAt: string;
  booked: Appointment | null;
  onReset: () => void;
}) {
  function downloadIcs() {
    const ics = buildIcs({
      uid: booked?.id ?? `pending-${startsAt}`,
      title: `${service.name} at ${tenant.name}`,
      description: `With ${provider.name}. ${tenant.cancellationPolicy}`,
      location: tenant.name,
      startsAt,
      endsAt,
      organizerName: tenant.name,
      organizerEmail: "bookings@clinicbook.app",
    });
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${service.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const when = new Date(startsAt);
  return (
    <div className="mx-auto max-w-xl py-6" aria-live="polite">
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-md",
          pending ? "bg-sand-200 text-ink-700" : "bg-clinic-700 text-white"
        )}
      >
        {pending ? <Loader2 className="h-6 w-6 animate-spin" /> : <Check className="h-6 w-6" />}
      </div>
      <h1 className="mt-5 font-display text-4xl font-semibold text-ink-900">
        {pending ? "Reserving your time…" : "You are booked."}
      </h1>
      <p className="mt-2 text-ink-600">
        {pending
          ? "Holding this slot while we confirm it."
          : `A confirmation has been emailed. ${tenant.name} looks forward to seeing you.`}
      </p>

      <dl className="mt-8 divide-y divide-ink-100 border-y border-ink-100 text-sm">
        <Line label="Service" value={`${service.name} · ${service.durationMinutes} min`} />
        <Line label="With" value={provider.name} />
        <Line label="When" value={formatInZone(when, tenant.timezone, "full")} />
        <Line label="Price" value={formatMoney(service.priceCents, service.currency)} />
        <Line label="Confirmation" value={booked ? booked.id.toUpperCase() : "Pending"} mono />
      </dl>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={downloadIcs}>
          <CalendarPlus className="h-4 w-4" /> Add to calendar (.ics)
        </Button>
        <Button variant="outline" onClick={onReset} disabled={pending}>
          Book another
        </Button>
        <Button asChild variant="ghost">
          <Link href={`/t/${tenant.slug}/appointments`}>View appointments</Link>
        </Button>
      </div>
      <p className="mt-6 text-xs leading-relaxed text-ink-500">{tenant.cancellationPolicy}</p>
    </div>
  );
}

function Line({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-6 py-3">
      <dt className="text-ink-400">{label}</dt>
      <dd className={cn("text-right font-semibold text-ink-900", mono && "font-mono text-xs tracking-wider")}>{value}</dd>
    </div>
  );
}
