interface RateLimitBucket {
  hits: number;
  resetAt: number;
}

const rateLimitBuckets = new Map<string, RateLimitBucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  key: string,
  maxHits: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existingBucket = rateLimitBuckets.get(key);

  if (!existingBucket || existingBucket.resetAt <= now) {
    const resetAt = now + windowMs;
    rateLimitBuckets.set(key, {
      hits: 1,
      resetAt
    });

    return {
      allowed: true,
      remaining: maxHits - 1,
      resetAt,
      retryAfterSeconds: Math.ceil(windowMs / 1000)
    };
  }

  existingBucket.hits += 1;

  const allowed = existingBucket.hits <= maxHits;
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((existingBucket.resetAt - now) / 1000)
  );

  return {
    allowed,
    remaining: Math.max(0, maxHits - existingBucket.hits),
    resetAt: existingBucket.resetAt,
    retryAfterSeconds
  };
}
