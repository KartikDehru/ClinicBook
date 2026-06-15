import { AccessGate } from "@/components/layout/access-gate";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { SettingsEditor } from "@/components/tenant/settings-editor";
import { can } from "@/lib/auth/rbac";
import { loadTenantPage } from "@/lib/auth/page-guard";

const FALLBACK_ZONES = [
  "America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York", "America/Toronto",
  "America/Sao_Paulo", "Europe/London", "Europe/Paris", "Europe/Berlin", "Africa/Johannesburg",
  "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney", "Pacific/Auckland",
];

export default async function SettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await loadTenantPage(slug, "settings:read");
  if (!ctx.ok) return <AccessGate ctx={ctx} path={`/t/${slug}/settings`} />;
  const { tenant, actor } = ctx;

  let zones: string[];
  try {
    zones = Intl.supportedValuesOf("timeZone");
  } catch {
    zones = FALLBACK_ZONES;
  }
  if (!zones.includes(tenant.timezone)) zones = [tenant.timezone, ...zones];

  return (
    <>
      <PageHeader title="Settings" description="Hours, timezone and cancellation policy for this location." />
      <Card className="max-w-4xl">
        <CardBody className="p-6">
          <SettingsEditor
            tenantId={tenant.id}
            timezones={zones}
            readOnly={!can(actor, "settings:write")}
            initial={{
              name: tenant.name,
              timezone: tenant.timezone,
              businessHours: tenant.businessHours,
              cancellationPolicy: tenant.cancellationPolicy,
              cancellationWindowHours: tenant.cancellationWindowHours,
            }}
          />
        </CardBody>
      </Card>
    </>
  );
}
