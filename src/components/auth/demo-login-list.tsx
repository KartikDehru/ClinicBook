"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { Alert } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface DemoUserRow {
  id: string;
  name: string;
  email: string;
  roleLabel: string;
  role: string;
  home: string;
}

export interface DemoGroup {
  tenantName: string;
  users: DemoUserRow[];
}

export function DemoLoginList({ groups, next }: { groups: DemoGroup[]; next?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(user: DemoUserRow) {
    setPending(user.id);
    setError(null);
    try {
      await apiFetch("/api/auth/demo-login", { method: "POST", json: { userId: user.id } });
      router.push(next && next.startsWith("/") ? next : user.home);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
      setPending(null);
    }
  }

  return (
    <div className="space-y-8">
      {error && <Alert>{error}</Alert>}
      {groups.map((g) => (
        <section key={g.tenantName}>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">{g.tenantName}</h2>
          <ul className="divide-y divide-ink-100 overflow-hidden rounded-lg border border-ink-100 bg-white">
            {g.users.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink-900">{u.name}</p>
                  <p className="truncate text-xs text-ink-500">{u.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={u.role === "owner" ? "teal" : u.role === "platform_admin" ? "ink" : "neutral"}>
                    {u.roleLabel}
                  </Badge>
                  <Button size="sm" variant="outline" disabled={pending !== null} onClick={() => void signIn(u)}>
                    {pending === u.id ? "Signing in…" : "Sign in"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
