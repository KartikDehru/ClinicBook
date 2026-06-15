import Link from "next/link";
import { cn } from "@/lib/utils";

export function Wordmark({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
        <path d="M3 24V12a10 10 0 0 1 20 0v12" fill="none" stroke={tone === "light" ? "#fff" : "#175a55"} strokeWidth="2.4" />
        <path d="M13 24V9" stroke={tone === "light" ? "#a9ddd5" : "#2a8a80"} strokeWidth="2.4" />
        <path d="M7 24V14M19 24V14" stroke={tone === "light" ? "#a9ddd5" : "#2a8a80"} strokeWidth="1.6" />
      </svg>
      <span
        className={cn(
          "font-display text-xl font-semibold tracking-tight",
          tone === "light" ? "text-white" : "text-ink-900"
        )}
      >
        ClinicBook
      </span>
    </span>
  );
}

export function SiteHeader({ onDark = false }: { onDark?: boolean }) {
  const link = onDark ? "text-white/80 hover:text-white" : "text-ink-600 hover:text-ink-900";
  return (
    <header
      className={cn(
        "z-20 w-full",
        onDark ? "absolute inset-x-0 top-0" : "border-b border-ink-100 bg-white"
      )}
    >
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-6">
        <Link href="/" aria-label="ClinicBook home">
          <Wordmark tone={onDark ? "light" : "dark"} />
        </Link>
        <nav className={cn("hidden items-center gap-8 text-sm font-semibold md:flex", link)}>
          <Link href="/#product" className={link}>
            Product
          </Link>
          <Link href="/#clinics" className={link}>
            Clinics
          </Link>
          <Link href="/pricing" className={link}>
            Pricing
          </Link>
        </nav>
        <div className="flex items-center gap-5 text-sm font-semibold">
          <Link href="/demo" className={link}>
            Sign in
          </Link>
          <Link
            href="/t/riverside-clinic"
            className={cn(
              "hidden rounded-md px-4 py-2 sm:inline-block",
              onDark ? "bg-white text-clinic-900 hover:bg-sand-100" : "bg-clinic-700 text-white hover:bg-clinic-800"
            )}
          >
            Open a live clinic
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-100 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <Wordmark tone="dark" />
        <nav className="flex flex-wrap gap-x-8 gap-y-2 text-sm font-semibold text-ink-500">
          <Link href="/pricing" className="hover:text-ink-900">Pricing</Link>
          <Link href="/demo" className="hover:text-ink-900">Sign in</Link>
          <Link href="/admin" className="hover:text-ink-900">Platform admin</Link>
          <Link href="/api/health" className="hover:text-ink-900">Status</Link>
        </nav>
        <p className="text-sm text-ink-400">© {new Date().getFullYear()} ClinicBook</p>
      </div>
    </footer>
  );
}
