import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TenantNotFound() {
  return (
    <div className="mx-auto mt-24 max-w-md text-center">
      <h1 className="font-display text-3xl font-semibold text-ink-900">Organization not found</h1>
      <p className="mt-3 text-ink-600">There is no workspace at this address.</p>
      <Button asChild className="mt-6">
        <Link href="/">Back to ClinicBook</Link>
      </Button>
    </div>
  );
}
