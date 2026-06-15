import { AppointmentError } from "@/lib/errors";

export interface TokenBucketOptions {
  /** Maximum burst size. */
  capacity: number;
  /** Tokens restored per second. */
  refillPerSecond: number;
  now?: () => number;
  /** Evict idle buckets once the map grows past this size. */
  maxKeys?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

interface Bucket {
  tokens: number;
  updatedAt: number;
}

/** In-memory token bucket. Swap for Redis (e.g. INCR + TTL) behind the same shape in multi-instance deployments. */
export class TokenBucketLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly now: () => number;
  private readonly maxKeys: number;

  constructor(private readonly options: TokenBucketOptions) {
    this.now = options.now ?? Date.now;
    this.maxKeys = options.maxKeys ?? 10_000;
  }

  take(key: string, cost = 1): RateLimitResult {
    const { capacity, refillPerSecond } = this.options;
    const t = this.now();
    const bucket = this.buckets.get(key) ?? { tokens: capacity, updatedAt: t };
    const elapsedSec = Math.max(0, (t - bucket.updatedAt) / 1000);
    bucket.tokens = Math.min(capacity, bucket.tokens + elapsedSec * refillPerSecond);
    bucket.updatedAt = t;

    let allowed = false;
    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      allowed = true;
    }
    this.buckets.set(key, bucket);
    if (this.buckets.size > this.maxKeys) this.evict(t);

    return {
      allowed,
      remaining: Math.floor(bucket.tokens),
      retryAfterSeconds: allowed ? 0 : Math.ceil((cost - bucket.tokens) / refillPerSecond),
    };
  }

  private evict(t: number) {
    const full = this.options.capacity / this.options.refillPerSecond;
    for (const [k, b] of this.buckets) {
      if ((t - b.updatedAt) / 1000 > full) this.buckets.delete(k);
    }
  }
}

/** Throws RATE_LIMITED when the bucket for `key` is empty. */
export function enforceRateLimit(limiter: TokenBucketLimiter, key: string): RateLimitResult {
  const result = limiter.take(key);
  if (!result.allowed) {
    throw new AppointmentError("RATE_LIMITED", "Too many requests. Please slow down.", {
      retryAfterSeconds: result.retryAfterSeconds,
    });
  }
  return result;
}

const g = globalThis as unknown as {
  __cbLimiters?: { booking: TokenBucketLimiter; checkout: TokenBucketLimiter };
};

export function getLimiters() {
  if (!g.__cbLimiters) {
    g.__cbLimiters = {
      booking: new TokenBucketLimiter({ capacity: 12, refillPerSecond: 0.5 }),
      checkout: new TokenBucketLimiter({ capacity: 5, refillPerSecond: 1 / 15 }),
    };
  }
  return g.__cbLimiters;
}
