"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { Alert, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import type { AppointmentStatus, UserRole } from "@/types";

interface Props {
  appointmentId: string;
  status: AppointmentStatus;
  tenantSlug: string;
  role: UserRole;
  /** Inline single-button variant for dense lists. */
  compact?: boolean;
}

type Action = "confirm" | "complete" | "no_show" | "cancel";

export function AppointmentActions({ appointmentId, status, tenantSlug, role, compact }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [reason, setReason] = useState("");

  const isStaff = role !== "client";
  const live = status === "scheduled" || status === "confirmed";

  async function run(action: Action, extra?: Record<string, unknown>) {
    setBusy(action);
    setError(null);
    try {
      await apiFetch(`/api/appointments/${appointmentId}`, { method: "PATCH", json: { action, ...extra } });
      setConfirmingCancel(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  if (!live && compact) return null;

  if (compact) {
    return status === "scheduled" && isStaff ? (
      <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void run("confirm")}>
        {busy ? "…" : "Confirm"}
      </Button>
    ) : null;
  }

  if (!live) {
    return <p className="text-sm text-ink-500">No further actions: this appointment is {status.replace("_", " ")}.</p>;
  }

  return (
    <div className="space-y-3">
      {error && <Alert>{error}</Alert>}
      <div className="flex flex-wrap gap-2">
        {isStaff && status === "scheduled" && (
          <Button size="sm" disabled={busy !== null} onClick={() => void run("confirm")}>
            Confirm
          </Button>
        )}
        {isStaff && (
          <>
            <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void run("complete")}>
              Mark completed
            </Button>
            <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void run("no_show")}>
              No-show
            </Button>
          </>
        )}
        <Button asChild size="sm" variant="outline">
          <Link href={`/t/${tenantSlug}/appointments/${appointmentId}/reschedule`}>Reschedule</Link>
        </Button>
        <Button size="sm" variant="ghost" className="text-signal-red" onClick={() => setConfirmingCancel((v) => !v)}>
          Cancel
        </Button>
      </div>
      {confirmingCancel && (
        <div className="space-y-2 rounded-md border border-red-200 bg-red-50 p-3">
          <Input
            placeholder="Reason (shared with the customer)"
            value={reason}
            maxLength={300}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={busy !== null}
              onClick={() => void run("cancel", { reason: reason || undefined })}
            >
              {busy === "cancel" ? "Cancelling…" : "Cancel appointment"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmingCancel(false)}>
              Keep
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
