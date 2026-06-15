"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import type { DayHours } from "@/types";
import { cn } from "@/lib/utils";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ORDER = [1, 2, 3, 4, 5, 6, 0];

interface Props {
  tenantId: string;
  initial: {
    name: string;
    timezone: string;
    businessHours: DayHours[];
    cancellationPolicy: string;
    cancellationWindowHours: number;
  };
  timezones: string[];
  readOnly: boolean;
}

export function SettingsEditor({ tenantId, initial, timezones, readOnly }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [hours, setHours] = useState<DayHours[]>(initial.businessHours);
  const [policy, setPolicy] = useState(initial.cancellationPolicy);
  const [windowHours, setWindowHours] = useState(String(initial.cancellationWindowHours));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const setDay = (day: number, patch: Partial<DayHours>) =>
    setHours((hs) => hs.map((h) => (h.day === day ? { ...h, ...patch } : h)));

  function copyMondayToWeekdays() {
    const mon = hours.find((h) => h.day === 1)!;
    setHours((hs) => hs.map((h) => (h.day >= 1 && h.day <= 5 ? { ...h, open: mon.open, close: mon.close } : h)));
  }

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await apiFetch(`/api/tenants/${tenantId}/settings`, {
        method: "PATCH",
        json: {
          name,
          timezone,
          businessHours: hours,
          cancellationPolicy: policy,
          cancellationWindowHours: Number(windowHours),
        },
      });
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Could not save settings");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="space-y-10"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <fieldset disabled={readOnly || busy} className="space-y-10">
        <section className="grid gap-5 sm:grid-cols-2">
          <Field label="Organization name">
            <Input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Timezone" hint="Slots, reminders and the calendar all use this zone.">
            <Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </Field>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-ink-900">Business hours</h3>
            {!readOnly && (
              <Button type="button" size="sm" variant="ghost" onClick={copyMondayToWeekdays}>
                Copy Monday to weekdays
              </Button>
            )}
          </div>
          <ul className="divide-y divide-ink-100 overflow-hidden rounded-lg border border-ink-200 bg-white">
            {ORDER.map((d) => {
              const h = hours.find((x) => x.day === d)!;
              const open = h.open !== null;
              return (
                <li key={d} className="grid grid-cols-[120px_1fr] items-center gap-4 px-4 py-3 sm:grid-cols-[140px_100px_1fr]">
                  <label className="flex items-center gap-2.5 text-sm font-bold text-ink-900">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-clinic-700"
                      checked={open}
                      onChange={(e) =>
                        setDay(d, e.target.checked ? { open: "09:00", close: "17:00" } : { open: null, close: null })
                      }
                    />
                    {DAY_NAMES[d]}
                  </label>
                  <span className={cn("hidden text-sm sm:block", open ? "text-ink-500" : "text-ink-300")}>
                    {open ? "Open" : "Closed"}
                  </span>
                  {open ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        aria-label={`${DAY_NAMES[d]} opens`}
                        className="w-32"
                        value={h.open ?? ""}
                        onChange={(e) => setDay(d, { open: e.target.value })}
                      />
                      <span className="text-ink-400">to</span>
                      <Input
                        type="time"
                        aria-label={`${DAY_NAMES[d]} closes`}
                        className="w-32"
                        value={h.close ?? ""}
                        onChange={(e) => setDay(d, { close: e.target.value })}
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-ink-300 sm:hidden">Closed</span>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-ink-500">
            Changing hours does not move existing appointments; it only affects new bookings.
          </p>
        </section>

        <section className="grid gap-5 sm:grid-cols-[200px_1fr]">
          <Field label="Self-service cancel window" hint="Hours before the visit. 0 allows cancellation any time.">
            <Input type="number" min={0} max={168} value={windowHours} onChange={(e) => setWindowHours(e.target.value)} />
          </Field>
          <Field label="Cancellation policy" hint="Shown at booking and in confirmation emails.">
            <Textarea rows={4} maxLength={600} value={policy} onChange={(e) => setPolicy(e.target.value)} />
          </Field>
        </section>
      </fieldset>

      {error && <Alert>{error}</Alert>}
      {saved && <Alert tone="success">Settings saved.</Alert>}
      {readOnly ? (
        <Alert tone="info">Only owners can change settings.</Alert>
      ) : (
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? "Saving…" : "Save settings"}
        </Button>
      )}
    </form>
  );
}
