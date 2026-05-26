import Link from "next/link";
import { CalendarDays } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <CalendarDays className="h-5 w-5" />
          </span>
          ClinicBook
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
          <Link href="/#features" className="hover:text-brand-600">
            Features
          </Link>
          <Link href="/pricing" className="hover:text-brand-600">
            Pricing
          </Link>
          <Link href="/admin" className="hover:text-brand-600">
            Admin
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/demo"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Live demo
          </Link>
          <Link
            href="/t/riverside-clinic"
            className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Book a visit
          </Link>
        </div>
      </div>
    </header>
  );
}