import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { DemoLoginList, type DemoGroup } from "@/components/auth/demo-login-list";
import { roleLabel } from "@/lib/auth/rbac";
import { getContainer } from "@/lib/container";
import { env } from "@/lib/env";
import { Alert } from "@/components/ui/form";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const { repos } = getContainer();
  const [tenants, users] = await Promise.all([repos.tenants.list(), repos.users.listAll()]);

  const groups: DemoGroup[] = [
    {
      tenantName: "Platform",
      users: users
        .filter((u) => u.tenantId === null)
        .map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, roleLabel: roleLabel(u.role), home: "/admin" })),
    },
    ...tenants.map((t) => ({
      tenantName: t.name,
      users: users
        .filter((u) => u.tenantId === t.id)
        .map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          roleLabel: roleLabel(u.role),
          home: u.role === "client" ? `/t/${t.slug}/book` : `/t/${t.slug}`,
        })),
    })),
  ].filter((g) => g.users.length > 0);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="font-display text-4xl font-semibold text-ink-900">Sign in</h1>
        <p className="mb-8 mt-3 text-ink-600">
          Choose an identity to see the product from that role. Owners manage settings, billing and
          the team; staff run the schedule; clients only see their own appointments.
        </p>
        {env.DEMO_AUTH_ENABLED ? (
          <DemoLoginList groups={groups} next={next} />
        ) : (
          <Alert tone="info">Role switching is disabled in this environment.</Alert>
        )}
      </main>
    </>
  );
}
