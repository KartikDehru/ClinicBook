"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { PlanTier } from "@/types";

export function CheckoutButton({
  tenantId,
  plan,
}: {
  tenantId: string;
  plan: PlanTier;
}) {
  const [loading, setLoading] = useState(false);

  async function startCheckout() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, plan }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={() => void startCheckout()} disabled={loading || plan === "free"}>
      {loading ? "Redirecting…" : `Subscribe to ${plan}`}
    </Button>
  );
}