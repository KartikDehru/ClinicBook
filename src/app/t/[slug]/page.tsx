import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AppointmentActions } from "@/components/appointments/appointment-actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader, Stat } from "@/components/ui/page";
import { StatusBadge } from "@/components/ui/status";
import { can } from "@/lib/auth/rbac";
import { getActor } from "@/lib/auth/session";
import { getContainer } from "@/lib/container";
import { PLANS } from "@/lib/plans";
import {
  addDaysToLocalDate,
  dayOfWeekOfLocalDate,
  format12h,
  formatInZone,
  formatLocalDate,
  localDateString,
  startOfLocalDay,
} from "@/lib/time";
import { formatMoney } from "@/lib/utils";
import { notFound } from "next/navigation";

export default async function TenantHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getContainer();
  const tenant = await c.repos.tenants.getBySlug(slug);
  if (!tenant) notFound();
  const actor = await getActor();
  const member = actor && (actor.role === "platform_admin" || actor.tenantId === tenant.id) ? actor : null;

  if (!can(member, "appointment:manage")) {
    return <PublicLanding slug={slug} />;
  }

  const tz = tenant.timezone;
  const now = new Date();
  const today = localDateString(now, tz);
  const dayStart = startOfLocalDay(today, tz);
  const weekEnd = startOfLocalDay(addDaysToLocalDate(today, 7), tz);
  const [appointments, providers, customers, waitlist, seats, activity] = await Promise.all([
    c.repos.appointments.list({ tenantId: tenant.id, from: dayStart.toISOString(), to: weekEnd.toISOString() }),
    c.repos.providers.listByTenant(tenant.id),
    c.repos.customers.listByTenant(tenant.id),
    c.repos.waitlist.listByTenant(tenant.id),
    c.tenantAdmin.seatUsage(tenant.id),
    c.audit.list(member, tenant.id, { limit: 6 }),
  ]);
  const customerName = new Map(customers.map((x) => [x.id, x.name]));
  const providerName = new Map(providers.map((p) => [p.id, p.name]));

  const live = appointments.filter((a) => a.status !== "cancelled");
  const todays = live.filter((a) => localDateString(new Date(a.startsAt), tz) === today);
  const done = todays.filter((a) => a.status === "completed").length;
  const needsConfirm = live.filter(
    (a) => a.status === "scheduled" && Date.parse(a.startsAt) > now.getTime() && Date.parse(a.startsAt) < now.getTime() + 2 * 86_400_000
  );
  const openWaitlist = waitlist.filter((w) => w.status === "waiting" || w.status === "offered");

  const loadByDay = Array.from({ length: 7 }, (_, i) => {
    const date = addDaysToLocalDate(today, i);
    return {
      date,
      count: live.filter((a) => localDateString(new Date(a.startsAt), tz) === date).length,
      closed: !tenant.businessHours.find((h) => h.day === dayOfWeekOfLocalDate(date))?.open,
    };
  });
  const maxLoad = Math.max(1, ...loadByDay.map((d) => d.count));

  return (
    <>
      <PageHeader
        title="Today"
        description={formatInZone(now, tz, "weekday") + ", " + formatLocalDate(today, { month: "long", day: "numeric", year: "numeric" })}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/t/${slug}/appointments`}>Open calendar</Link>
            </Button>
            <Button asChild>
              <Link href={`/t/${slug}/book`}>New booking</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Today" value={todays.length} note={`${done} completed · ${todays.length - done} remaining`} />
        <Stat label="Awaiting confirmation" value={needsConfirm.length} note="Starting within 48 hours" />
        <Stat label="Waitlist" value={openWaitlist.length} note={`${openWaitlist.filter((w) => w.status === "offered").length} offered a slot`} />
        <Stat label="Staff seats" value={`${seats.used}/${seats.limit}`} note={`${PLANS[tenant.plan].name} plan`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader title="Today's schedule" description={`${todays.length} appointment${todays.length === 1 ? "" : "s"}`} />
          {todays.length === 0 ? (
            <CardBody>
              <EmptyState title="Nothing on the books today" body="Walk-ins can be added from New booking." />
            </CardBody>
          ) : (
            <ul className="divide-y divide-ink-100">
              {todays.map((a) => {
                const past = Date.parse(a.endsAt) < now.getTime();
                return (
                  <li key={a.id} className={`flex items-center gap-4 px-5 py-3.5 ${past && a.status === "completed" ? "opacity-60" : ""}`}>
                    <div className="w-20 shrink-0 text-sm font-bold tabular-nums text-ink-900">
                      {formatInZone(new Date(a.startsAt), tz, "time")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/t/${slug}/appointments?week=${today}&selected=${a.id}`}
                        className="block truncate text-sm font-bold text-ink-900 hover:text-clinic-700"
                      >
                        {customerName.get(a.customerId) ?? "Customer"}
                      </Link>
                      <p className="truncate text-xs text-ink-500">
                        {a.serviceName} · {providerName.get(a.providerId)}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                    <AppointmentActions appointmentId={a.id} status={a.status} tenantSlug={slug} role={member!.role} compact />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Next 7 days" description="Booked appointments per day" />
            <CardBody>
              <div className="flex h-28 items-end gap-2">
                {loadByDay.map((d) => (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="text-[11px] font-bold tabular-nums text-ink-500">{d.closed ? "·" : d.count}</span>
                    <div
                      className={d.closed ? "w-full rounded-sm bg-closed" : "w-full rounded-sm bg-clinic-600"}
                      style={{ height: `${d.closed ? 6 : Math.max(6, (d.count / maxLoad) * 72)}px` }}
                    />
                    <span className="text-[11px] font-semibold text-ink-400">
                      {formatLocalDate(d.date, { weekday: "short" })}
                    </span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Needs attention"
              action={
                <Link href={`/t/${slug}/appointments`} className="text-xs font-bold text-clinic-700 hover:underline">
                  Calendar
                </Link>
              }
            />
            <ul className="divide-y divide-ink-100 text-sm">
              {needsConfirm.slice(0, 4).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-ink-900">{customerName.get(a.customerId)}</span>
                    <span className="text-xs text-ink-500">{formatInZone(new Date(a.startsAt), tz, "dayTime")}</span>
                  </span>
                  <AppointmentActions appointmentId={a.id} status={a.status} tenantSlug={slug} role={member!.role} compact />
                </li>
              ))}
              {tenant.subscriptionStatus === "past_due" && (
                <li className="px-5 py-3 text-signal-red">Payment is past due. Update billing to avoid interruption.</li>
              )}
              {needsConfirm.length === 0 && tenant.subscriptionStatus !== "past_due" && (
                <li className="px-5 py-4 text-ink-500">Everything in the next 48 hours is confirmed.</li>
              )}
            </ul>
          </Card>

          <Card>
            <CardHeader
              title="Recent activity"
              action={
                can(member, "audit:read") ? (
                  <Link href={`/t/${slug}/activity`} className="text-xs font-bold text-clinic-700 hover:underline">
                    View all
                  </Link>
                ) : undefined
              }
            />
            <ul className="divide-y divide-ink-100 text-sm">
              {activity.length === 0 && <li className="px-5 py-4 text-ink-500">No activity yet.</li>}
              {activity.map((e) => (
                <li key={e.id} className="px-5 py-3">
                  <p className="text-ink-900">{e.summary}</p>
                  <p className="mt-0.5 text-xs text-ink-400">
                    {e.actorName} · {formatInZone(new Date(e.at), tz, "dayTime")}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}

async function PublicLanding({ slug }: { slug: string }) {
  const c = getContainer();
  const tenant = (await c.repos.tenants.getBySlug(slug))!;
  const services = await c.repos.services.listByTenant(tenant.id, { activeOnly: true });
  const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-5xl font-semibold leading-tight text-ink-900">{tenant.name}</h1>
      <p className="mt-4 text-lg text-ink-600">Book online in under a minute. Times shown in {tenant.timezone.replace("_", " ")}.</p>
      <div className="mt-8 flex gap-3">
        <Button asChild size="lg">
          <Link href={`/t/${slug}/book`}>
            Book an appointment <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href={`/demo?next=${encodeURIComponent(`/t/${slug}`)}`}>Sign in</Link>
        </Button>
      </div>

      <div className="mt-14 grid gap-10 md:grid-cols-2">
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wide text-ink-400">Services</h2>
          <ul className="mt-3 divide-y divide-ink-100 border-y border-ink-100">
            {services.map((s) => (
              <li key={s.id} className="flex items-baseline justify-between gap-4 py-3">
                <span>
                  <span className="block font-bold text-ink-900">{s.name}</span>
                  <span className="text-sm text-ink-500">{s.durationMinutes} min</span>
                </span>
                <span className="font-semibold tabular-nums text-ink-900">{formatMoney(s.priceCents, s.currency)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wide text-ink-400">Hours</h2>
          <ul className="mt-3 divide-y divide-ink-100 border-y border-ink-100">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => {
              const h = tenant.businessHours.find((x) => x.day === d);
              return (
                <li key={d} className="flex justify-between py-3 text-sm">
                  <span className="font-semibold text-ink-900">{names[d]}</span>
                  <span className="tabular-nums text-ink-600">
                    {h?.open && h.close ? `${format12h(h.open)} – ${format12h(h.close)}` : "Closed"}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-sm text-ink-500">{tenant.cancellationPolicy}</p>
        </section>
      </div>
    </div>
  );
}
