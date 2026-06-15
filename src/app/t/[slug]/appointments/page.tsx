import Link from "next/link";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { AppointmentActions } from "@/components/appointments/appointment-actions";
import { WeekCalendar, type CalendarEvent } from "@/components/calendar/week-calendar";
import { AccessGate } from "@/components/layout/access-gate";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { EVENT_STYLE, STATUS_LABEL, StatusBadge } from "@/components/ui/status";
import { loadTenantPage } from "@/lib/auth/page-guard";
import { getContainer } from "@/lib/container";
import {
  addDaysToLocalDate,
  formatInZone,
  formatLocalDate,
  isValidLocalDate,
  localDateString,
  startOfLocalDay,
  startOfLocalWeek,
} from "@/lib/time";
import { cn, formatMoney } from "@/lib/utils";
import type { Appointment, AppointmentStatus } from "@/types";

export default async function AppointmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ week?: string; provider?: string; selected?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await loadTenantPage(slug, "appointment:read");
  if (!ctx.ok) return <AccessGate ctx={ctx} path={`/t/${slug}/appointments`} />;
  const { tenant, actor } = ctx;
  const c = getContainer();
  const tz = tenant.timezone;
  const now = new Date();

  if (actor.role === "client") {
    return <ClientAppointments slug={slug} />;
  }

  const anchor = sp.week && isValidLocalDate(sp.week) ? sp.week : localDateString(now, tz);
  const weekStart = startOfLocalWeek(anchor);
  const weekEnd = addDaysToLocalDate(weekStart, 7);
  const providers = await c.repos.providers.listByTenant(tenant.id);
  const providerFilter = providers.find((p) => p.id === sp.provider)?.id;

  const [appointments, customers] = await Promise.all([
    c.appointments.list(actor, {
      tenantId: tenant.id,
      from: startOfLocalDay(weekStart, tz).toISOString(),
      to: startOfLocalDay(weekEnd, tz).toISOString(),
      providerId: providerFilter,
    }),
    c.repos.customers.listByTenant(tenant.id),
  ]);
  const customerName = new Map(customers.map((x) => [x.id, x.name]));
  const providerName = new Map(providers.map((p) => [p.id, p.name]));
  const events: CalendarEvent[] = appointments.map((a) => ({
    ...a,
    customerName: customerName.get(a.customerId) ?? "Customer",
    providerName: providerName.get(a.providerId) ?? "Provider",
  }));

  const href = (over: { week?: string; provider?: string | null; selected?: string | null }) => {
    const q = new URLSearchParams();
    q.set("week", over.week ?? weekStart);
    const prov = over.provider === undefined ? providerFilter : over.provider;
    if (prov) q.set("provider", prov);
    if (over.selected) q.set("selected", over.selected);
    return `/t/${slug}/appointments?${q.toString()}`;
  };

  const selected = sp.selected ? events.find((e) => e.id === sp.selected) : undefined;
  const audit = selected ? await c.audit.list(actor, tenant.id, { entityId: selected.id, limit: 8 }) : [];
  const todayWeek = startOfLocalWeek(localDateString(now, tz));
  const rangeLabel = `${formatLocalDate(weekStart, { month: "short", day: "numeric" })} – ${formatLocalDate(
    addDaysToLocalDate(weekStart, 6),
    { month: "short", day: "numeric", year: "numeric" }
  )}`;

  return (
    <>
      <PageHeader
        title="Calendar"
        description={`${rangeLabel} · ${tz.replace("_", " ")}`}
        actions={
          <>
            <div className="flex overflow-hidden rounded-md border border-ink-200 bg-white">
              <Link
                href={href({ week: addDaysToLocalDate(weekStart, -7), selected: null })}
                aria-label="Previous week"
                className="flex h-10 w-10 items-center justify-center text-ink-700 hover:bg-ink-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <Link
                href={href({ week: todayWeek, selected: null })}
                className="flex h-10 items-center border-x border-ink-200 px-4 text-sm font-semibold text-ink-900 hover:bg-ink-50"
              >
                Today
              </Link>
              <Link
                href={href({ week: addDaysToLocalDate(weekStart, 7), selected: null })}
                aria-label="Next week"
                className="flex h-10 w-10 items-center justify-center text-ink-700 hover:bg-ink-50"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <Button asChild>
              <Link href={`/t/${slug}/book`}>New booking</Link>
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by provider">
          <FilterLink active={!providerFilter} href={href({ provider: null, selected: null })}>
            All providers
          </FilterLink>
          {providers.map((p) => (
            <FilterLink key={p.id} active={providerFilter === p.id} href={href({ provider: p.id, selected: null })}>
              {p.name}
            </FilterLink>
          ))}
        </div>
        <ul className="flex flex-wrap items-center gap-4 text-xs text-ink-500">
          {(["scheduled", "confirmed", "completed", "no_show", "cancelled"] as AppointmentStatus[]).map((s) => (
            <li key={s} className="flex items-center gap-1.5">
              <span className={cn("h-3 w-3 rounded-sm border-l-4", EVENT_STYLE[s].replace("line-through", ""))} />
              {STATUS_LABEL[s]}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <WeekCalendar
          tenant={tenant}
          weekStart={weekStart}
          events={events}
          now={now}
          selectedId={selected?.id}
          eventHref={(id) => href({ selected: id })}
        />

        <aside className="xl:sticky xl:top-6 xl:self-start">
          {selected ? (
            <Card>
              <CardHeader
                title={selected.customerName}
                description={selected.serviceName}
                action={<StatusBadge status={selected.status} />}
              />
              <CardBody className="space-y-4">
                <dl className="grid grid-cols-[88px_1fr] gap-y-2 text-sm">
                  <dt className="text-ink-400">When</dt>
                  <dd className="font-semibold text-ink-900">{formatInZone(new Date(selected.startsAt), tz, "full")}</dd>
                  <dt className="text-ink-400">With</dt>
                  <dd className="font-semibold text-ink-900">{selected.providerName}</dd>
                  <dt className="text-ink-400">Price</dt>
                  <dd className="font-semibold text-ink-900">{formatMoney(selected.priceCents, selected.currency)}</dd>
                  {selected.notes && (
                    <>
                      <dt className="text-ink-400">Notes</dt>
                      <dd className="text-ink-700">{selected.notes}</dd>
                    </>
                  )}
                  {selected.cancelReason && (
                    <>
                      <dt className="text-ink-400">Reason</dt>
                      <dd className="text-ink-700">{selected.cancelReason}</dd>
                    </>
                  )}
                </dl>
                <AppointmentActions appointmentId={selected.id} status={selected.status} tenantSlug={slug} role={actor.role} />
                <a
                  href={`/api/appointments/${selected.id}/ics`}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-clinic-700 hover:underline"
                >
                  <Download className="h-3.5 w-3.5" /> Download .ics
                </a>
                <div className="border-t border-ink-100 pt-4">
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">History</h4>
                  <ul className="space-y-2.5 text-sm">
                    {audit.length === 0 && <li className="text-ink-500">No recorded changes.</li>}
                    {audit.map((e) => (
                      <li key={e.id}>
                        <p className="text-ink-800">{e.summary}</p>
                        <p className="text-xs text-ink-400">
                          {e.actorName} · {formatInZone(new Date(e.at), tz, "dayTime")}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardBody className="text-sm text-ink-500">
                Select an appointment to confirm it, move it, or review who changed it.
              </CardBody>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors",
        active ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
      )}
    >
      {children}
    </Link>
  );
}

async function ClientAppointments({ slug }: { slug: string }) {
  const ctx = await loadTenantPage(slug, "appointment:read");
  if (!ctx.ok) return null;
  const { tenant, actor } = ctx;
  const c = getContainer();
  const tz = tenant.timezone;
  const [mine, providers] = await Promise.all([
    c.appointments.list(actor, { tenantId: tenant.id }),
    c.repos.providers.listByTenant(tenant.id),
  ]);
  const providerName = new Map(providers.map((p) => [p.id, p.name]));
  const now = Date.now();
  const upcoming = mine.filter((a) => Date.parse(a.endsAt) >= now && a.status !== "cancelled");
  const past = mine.filter((a) => !upcoming.includes(a)).reverse();

  const row = (a: Appointment, withActions: boolean) => (
    <li key={a.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <div>
        <p className="font-bold text-ink-900">{a.serviceName}</p>
        <p className="text-sm text-ink-500">
          {formatInZone(new Date(a.startsAt), tz, "full")} · {providerName.get(a.providerId)}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge status={a.status} />
        {withActions && (
          <a href={`/api/appointments/${a.id}/ics`} className="text-sm font-semibold text-clinic-700 hover:underline">
            Add to calendar
          </a>
        )}
      </div>
      {withActions && (
        <div className="w-full">
          <AppointmentActions appointmentId={a.id} status={a.status} tenantSlug={slug} role="client" />
        </div>
      )}
    </li>
  );

  return (
    <>
      <PageHeader
        title="My appointments"
        description={tenant.name}
        actions={
          <Button asChild>
            <Link href={`/t/${slug}/book`}>Book a visit</Link>
          </Button>
        }
      />
      <Card>
        <CardHeader title="Upcoming" description={tenant.cancellationPolicy} />
        {upcoming.length === 0 ? (
          <CardBody>
            <EmptyState title="No upcoming visits" body="Book a time that suits you." />
          </CardBody>
        ) : (
          <ul className="divide-y divide-ink-100">{upcoming.map((a) => row(a, true))}</ul>
        )}
      </Card>
      {past.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Past" />
          <ul className="divide-y divide-ink-100">{past.map((a) => row(a, false))}</ul>
        </Card>
      )}
    </>
  );
}
