import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { getDemoUsers } from "@/lib/auth/session";
import { store } from "@/lib/store";
import { roleLabel } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import { DemoLoginButtons } from "@/components/auth/demo-login-buttons";

export default function DemoPage() {
  const users = getDemoUsers();

  return (
    <>
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-bold text-slate-900">Demo logins</h1>
        <p className="mt-2 text-slate-600">
          Switch roles to test owner, staff, and client access (cookie session).
        </p>
        <DemoLoginButtons users={users} tenants={store.tenants} />
        <div className="mt-8 space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              <span>
                {u.name} — {roleLabel(u.role)}
              </span>
              <Button asChild variant="outline" size="sm">
                <Link href={`/t/${store.tenants.find((t) => t.id === u.tenantId)?.slug}`}>
                  Workspace
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}