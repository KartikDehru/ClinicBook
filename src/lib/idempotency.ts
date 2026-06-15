import { createHash } from "node:crypto";
import { AppointmentError } from "@/lib/errors";
import type { IdempotencyRepository } from "@/lib/repos/types";

const TTL_MS = 24 * 60 * 60 * 1000;

export function fingerprintOf(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 32);
}

export interface IdempotentResult<T> {
  value: T;
  replayed: boolean;
}

/**
 * Runs `fn` at most once per (tenant, key). Replays the stored response for retries with the same
 * payload; rejects reuse of a key with a different payload; coalesces concurrent duplicates.
 * Only successful results are stored so a failed attempt can be retried with the same key.
 */
export class IdempotencyGuard {
  private readonly inflight = new Map<string, Promise<unknown>>();

  constructor(
    private readonly store: IdempotencyRepository,
    private readonly now: () => number = Date.now
  ) {}

  static scopedKey(tenantId: string, key: string): string {
    return `${tenantId}:${key}`;
  }

  async run<T>(
    tenantId: string,
    key: string,
    fingerprint: string,
    fn: () => Promise<T>
  ): Promise<IdempotentResult<T>> {
    if (!/^[\w.:-]{8,128}$/.test(key)) {
      throw new AppointmentError(
        "VALIDATION_FAILED",
        "Idempotency-Key must be 8-128 characters (letters, digits, . _ : -)."
      );
    }
    const scoped = IdempotencyGuard.scopedKey(tenantId, key);

    const existing = await this.store.get(scoped);
    if (existing && this.now() - existing.createdAt < TTL_MS) {
      if (existing.fingerprint !== fingerprint) {
        throw new AppointmentError(
          "IDEMPOTENCY_MISMATCH",
          "This Idempotency-Key was already used with a different request."
        );
      }
      return { value: existing.response as T, replayed: true };
    }

    const pending = this.inflight.get(scoped);
    if (pending) {
      const value = (await pending) as T;
      return { value, replayed: true };
    }

    const promise = (async () => {
      const value = await fn();
      await this.store.set(scoped, { fingerprint, response: value, createdAt: this.now() });
      return value;
    })();
    this.inflight.set(scoped, promise);
    try {
      return { value: await promise, replayed: false };
    } finally {
      this.inflight.delete(scoped);
    }
  }
}
