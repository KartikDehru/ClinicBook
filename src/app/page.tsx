import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { TenantShowcase } from "@/components/marketing/tenant-showcase";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-brand-600">
          Multi-tenant SaaS
        </p>
        <h1 className="mt-3 text-balance text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Appointments, staff, and billing in one place
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
          ClinicBook helps clinics, gyms, and tutors run online booking with Stripe subscriptions
          and per-tenant isolation.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/t/riverside-clinic">Try Riverside Clinic</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/pricing">View pricing</Link>
          </Button>
        </div>
      </section>
      <FeatureGrid />
      <TenantShowcase />
      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        ClinicBook demo — replace in-memory store with your database for production.
      </footer>
    </>
  );
}