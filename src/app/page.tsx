import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/layout/site-header";
import { ClinicAtmosphere } from "@/components/marketing/clinic-atmosphere";
import { WeekPreview } from "@/components/marketing/week-preview";
import { Button } from "@/components/ui/button";
import { getContainer } from "@/lib/container";
import { formatInZone } from "@/lib/time";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    title: "A week calendar that matches the wall schedule",
    body: "Every provider, every service, colour-coded by status. Move between weeks, open an appointment, confirm it, reschedule it or mark the no-show without leaving the page.",
  },
  {
    title: "Each location keeps its own clock",
    body: "Hours, slots and reminders are computed in the clinic's IANA timezone, including daylight-saving changes. A patient in another country still sees the right local time.",
  },
  {
    title: "A waitlist that refills cancellations",
    body: "When a slot opens, the first matching person on the waitlist is offered it automatically. Staff see who is waiting and who has been offered.",
  },
  {
    title: "Roles and a trail you can trust",
    body: "Owners, staff and clients each get exactly the access they need. Every change to an appointment is recorded with who did it, when, and what changed.",
  },
];

export default async function HomePage() {
  const tenants = (await getContainer().repos.tenants.list()).filter(
    (t) => t.subscriptionStatus !== "canceled"
  );
  const now = new Date();

  return (
    <>
      <section className="relative isolate flex min-h-[100svh] items-end overflow-hidden bg-clinic-950">
        <ClinicAtmosphere />
        <SiteHeader onDark />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-20 pt-40 sm:pb-28">
          <h1 className="font-display text-[clamp(4.5rem,13vw,10.5rem)] font-semibold leading-[0.9] tracking-tightest text-white">
            ClinicBook
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-white/85 sm:text-xl">
            Scheduling for clinics that run on time: online booking, a live week calendar, and a
            waitlist that fills every cancellation.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" variant="onDark">
              <Link href="/t/riverside-clinic">
                Open a live clinic <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outlineOnDark">
              <Link href="/pricing">View pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="product" className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-16 px-6 py-28 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <div>
            <h2 className="font-display text-4xl font-semibold leading-tight text-ink-900 sm:text-5xl">
              Built for the people who run the day.
            </h2>
            <ol className="mt-12 divide-y divide-ink-100 border-y border-ink-100">
              {FEATURES.map((f, i) => (
                <li key={f.title} className="grid grid-cols-[3rem_1fr] gap-4 py-7">
                  <span className="font-display text-xl text-clinic-600">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="text-lg font-bold text-ink-900">{f.title}</h3>
                    <p className="mt-2 leading-relaxed text-ink-600">{f.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="lg:sticky lg:top-10">
            <WeekPreview />
          </div>
        </div>
      </section>

      <section id="clinics" className="bg-sand-100">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <h2 className="font-display text-4xl font-semibold text-ink-900">Open a workspace</h2>
          <p className="mt-3 max-w-xl text-ink-600">
            Every organization is a fully isolated tenant with its own timezone, hours, services
            and team.
          </p>
          <div className="mt-10 divide-y divide-sand-300 border-y border-sand-300">
            {tenants.map((t) => (
              <Link
                key={t.id}
                href={`/t/${t.slug}`}
                className="group grid items-center gap-3 py-5 sm:grid-cols-[1.4fr_1fr_1fr_auto]"
              >
                <span className="font-display text-xl font-semibold text-ink-900 group-hover:text-clinic-700">
                  {t.name}
                </span>
                <span className="text-sm capitalize text-ink-600">{t.vertical}</span>
                <span className="text-sm tabular-nums text-ink-600">
                  {formatInZone(now, t.timezone, "time")} · {t.timezone.replace("_", " ")}
                </span>
                <ArrowRight className="h-4 w-4 text-ink-400 transition-transform group-hover:translate-x-1 group-hover:text-clinic-700" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-clinic-900">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-20 sm:flex-row sm:items-center">
          <h2 className="max-w-xl font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
            See a real week of appointments in Riverside Family Clinic.
          </h2>
          <Button asChild size="lg" variant="onDark">
            <Link href="/demo">Sign in as staff</Link>
          </Button>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
