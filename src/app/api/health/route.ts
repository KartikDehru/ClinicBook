import { NextResponse } from "next/server";
import { getContainer } from "@/lib/container";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

const startedAt = Date.now();

export async function GET() {
  const checks: Record<string, "ok" | "fail"> = {};
  try {
    await getContainer().repos.tenants.list();
    checks.store = "ok";
  } catch {
    checks.store = "fail";
  }
  checks.stripe = env.STRIPE_MOCK ? "ok" : env.STRIPE_WEBHOOK_SECRET ? "ok" : "fail";

  const healthy = Object.values(checks).every((c) => c === "ok");
  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      version: process.env.npm_package_version ?? "1.0.0",
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      stripeMode: env.STRIPE_MOCK ? "mock" : "live",
      checks,
      time: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503, headers: { "cache-control": "no-store" } }
  );
}
