import { z } from "zod";

/**
 * Environment contract for server modules. Parsed once on import and again at
 * boot via `src/instrumentation.ts`, so a bad deployment fails fast.
 */
const bool = z
  .enum(["true", "false", "1", "0"])
  .transform((v) => v === "true" || v === "1");

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
    ROOT_DOMAIN: z.string().min(1).default("localhost"),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error", "silent"]).default("info"),
    SESSION_SECRET: z.string().min(16).optional(),
    DEMO_AUTH_ENABLED: bool.optional(),
    STRIPE_SECRET_KEY: z.string().min(1).default("sk_test_mock"),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_PRICE_PRO: z.string().min(1).default("price_pro_mock"),
    STRIPE_PRICE_ENTERPRISE: z.string().min(1).default("price_enterprise_mock"),
    EMAIL_FROM: z.string().email().default("bookings@clinicbook.app"),
  })
  .superRefine((env, ctx) => {
    const isBuild = process.env.NEXT_PHASE === "phase-production-build";
    const mockStripe = env.STRIPE_SECRET_KEY.startsWith("sk_test_mock");
    if (env.NODE_ENV === "production" && !isBuild) {
      if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
        ctx.addIssue({
          code: "custom",
          path: ["SESSION_SECRET"],
          message: "SESSION_SECRET (>= 32 chars) is required in production",
        });
      }
      if (!mockStripe && !env.STRIPE_WEBHOOK_SECRET) {
        ctx.addIssue({
          code: "custom",
          path: ["STRIPE_WEBHOOK_SECRET"],
          message: "STRIPE_WEBHOOK_SECRET is required when using a live Stripe key",
        });
      }
    }
  });

export type Env = Omit<z.infer<typeof schema>, "DEMO_AUTH_ENABLED"> & {
  DEMO_AUTH_ENABLED: boolean;
  STRIPE_MOCK: boolean;
};

export function parseEnv(source: Record<string, string | undefined> = process.env): Env {
  const cleaned: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(source)) {
    // Treat blank values (`FOO=`) as unset so defaults apply.
    cleaned[k] = v === "" ? undefined : v;
  }
  const result = schema.safeParse(cleaned);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join("\n")}`);
  }
  const data = result.data;
  return {
    ...data,
    DEMO_AUTH_ENABLED: data.DEMO_AUTH_ENABLED ?? data.NODE_ENV !== "production",
    STRIPE_MOCK: data.STRIPE_SECRET_KEY.startsWith("sk_test_mock"),
  };
}

export const env: Env = parseEnv();
