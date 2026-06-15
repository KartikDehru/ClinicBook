import { getContainer } from "@/lib/container";
import { apiRoute } from "@/lib/http";
import { authorize } from "@/lib/auth/rbac";
import { mrrOf } from "@/lib/services/metrics";

export const GET = apiRoute(async ({ actor, json }) => {
  authorize(actor, "admin:read");
  const tenants = await getContainer().repos.tenants.list();
  return json({
    tenants: tenants.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      vertical: t.vertical,
      plan: t.plan,
      status: t.subscriptionStatus,
      timezone: t.timezone,
      mrr: mrrOf(t),
    })),
  });
});
