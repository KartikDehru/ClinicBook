/** Runs once when the Next.js server boots; fail fast on a bad environment. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { parseEnv } = await import("@/lib/env");
    parseEnv();
    const { logger } = await import("@/lib/logging");
    logger.info("clinicbook booted", { env: process.env.NODE_ENV });
  }
}
