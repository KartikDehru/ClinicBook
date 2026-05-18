"use client";

import { useRouter } from "next/navigation";
import type { Tenant, User } from "@/types";
import { Button } from "@/components/ui/button";
import { roleLabel } from "@/lib/auth/roles";

export function DemoLoginButtons({
  users,
  tenants,
}: {
  users: User[];
  tenants: Tenant[];
}) {
  const router = useRouter();

  async function login(userId: string) {
    await fetch("/api/auth/demo-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const user = users.find((u) => u.id === userId);
    const slug = tenants.find((t) => t.id === user?.tenantId)?.slug;
    if (slug) router.push(`/t/${slug}`);
    router.refresh();
  }

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {users.slice(0, 4).map((u) => (
        <Button key={u.id} variant="secondary" size="sm" onClick={() => void login(u.id)}>
          {u.name.split(" ")[0]} ({roleLabel(u.role)})
        </Button>
      ))}
    </div>
  );
}