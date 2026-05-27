import { Building2, CreditCard, Shield, Users, CalendarCheck, Mail } from "lucide-react";

const features = [
  {
    icon: Building2,
    title: "Multi-tenant by design",
    description: "Isolated orgs per clinic, gym, or tutoring business with slug and subdomain routing.",
  },
  {
    icon: CalendarCheck,
    title: "Real booking flows",
    description: "Book, reschedule, and cancel with conflict checks and provider availability windows.",
  },
  {
    icon: Users,
    title: "Roles & seat limits",
    description: "Owner, staff, and client roles with Free / Pro / Enterprise seat enforcement.",
  },
  {
    icon: CreditCard,
    title: "Stripe-ready billing",
    description: "Checkout sessions, subscription webhooks, and plan upgrades wired in code.",
  },
  {
    icon: Shield,
    title: "Tenant isolation",
    description: "Every query scoped by tenant ID — ready to swap the in-memory store for Postgres.",
  },
  {
    icon: Mail,
    title: "Notification stubs",
    description: "Email outbox for confirmations, reschedules, and billing receipts.",
  },
];

export function FeatureGrid() {
  return (
    <section id="features" className="py-16">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center text-3xl font-bold text-slate-900">Built for service businesses</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
          One platform for appointments, staff calendars, customers, and SaaS billing.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <Icon className="h-8 w-8 text-brand-600" />
              <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}