import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { TenantPageContext } from "@/lib/auth/page-guard";

/** Rendered by pages when `loadTenantPage` denies access. */
export function AccessGate({ ctx, path }: { ctx: Extract<TenantPageContext, { ok: false }>; path: string }) {
  const unauthorized = ctx.reason === "unauthorized";
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <h1 className="font-display text-3xl font-semibold text-ink-900">
        {unauthorized ? "Sign in to continue" : "You don't have access to this page"}
      </h1>
      <p className="mt-3 text-ink-600">
        {unauthorized
          ? `${ctx.tenant.name} requires you to be signed in.`
          : "Your role does not include this area. Ask an owner if you need access."}
      </p>
      <div className="mt-6 flex justify-center gap-3">
        {unauthorized ? (
          <Button asChild>
            <Link href={`/demo?next=${encodeURIComponent(path)}`}>Sign in</Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href={`/t/${ctx.tenant.slug}/book`}>Go to booking</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
