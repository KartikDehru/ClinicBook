"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="font-display text-4xl font-semibold text-ink-900">Something went wrong</h1>
      <p className="mt-3 text-ink-600">
        The error has been logged{error.digest ? ` (ref ${error.digest})` : ""}. Try again, and contact support if it persists.
      </p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
