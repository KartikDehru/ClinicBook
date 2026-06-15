"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { Alert } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function CheckoutButton({
  tenantId,
  plan,
  label,
  variant = "default",
}: {
  tenantId: string;
  plan: "pro" | "enterprise";
  label: string;
  variant?: "default" | "outline";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ url: string | null }>("/api/billing/checkout", {
        method: "POST",
        json: { tenantId, plan },
      });
      if (res.url) window.location.href = res.url;
      else router.refresh();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Checkout failed");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button className="w-full" variant={variant} disabled={loading} onClick={() => void start()}>
        {loading ? "Redirecting…" : label}
      </Button>
      {error && <Alert>{error}</Alert>}
    </div>
  );
}
