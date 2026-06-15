import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="font-display text-4xl font-semibold text-ink-900">Page not found</h1>
        <p className="mt-3 text-ink-600">The page you were looking for does not exist or has moved.</p>
        <Button asChild className="mt-6">
          <Link href="/">Back to ClinicBook</Link>
        </Button>
      </main>
    </>
  );
}
