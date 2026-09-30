/**
 * In-memory sliding-window rate limiter.
 *
 * Works per Vercel function instance. For strict cross-instance enforcement,
 * swap the Map for Upstash Redis (npm install @upstash/ratelimit @upstash/redis).
 */

interface Bucket {
  windowStart: number;
  count: number;
  windowMs: number;
}

const buckets = new Map<string, Bucket>();

const CLEANUP_INTERVAL = 5 * 60 * 1_000; // 5 minutes
let lastCleanup = Date.now();

function cleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart >= bucket.windowMs) {
      buckets.delete(key);
    }
  }
}

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

export interface RateLimiter {
  check: (key: string) => RateLimitCheckResult;
}

/**
 * Create a rate limiter with a sliding window.
 */
export function rateLimit({ windowMs = 60_000, max = 60 }: RateLimitOptions = {}): RateLimiter {
  return {
    check(key: string): RateLimitCheckResult {
      cleanup();

      const now = Date.now();
      let bucket = buckets.get(key);

      if (!bucket || now - bucket.windowStart >= windowMs) {
        bucket = { windowStart: now, count: 0, windowMs };
        buckets.set(key, bucket);
      }

      bucket.count += 1;
      const remaining = Math.max(0, max - bucket.count);
      const resetMs = windowMs - (now - bucket.windowStart);

      return { allowed: bucket.count <= max, remaining, resetMs };
    },
  };
}

/**
 * Apply a rate limit to an incoming request.
 * Returns a 429 Response if exceeded, `null` if allowed.
 */
export function checkRateLimit(
  request: Request,
  opts: RateLimitOptions = {},
  keyPrefix = "global"
): Response | null {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "anonymous";

  const limiter = rateLimit(opts);
  const { allowed, remaining, resetMs } = limiter.check(`${keyPrefix}:${ip}`);

  if (!allowed) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": Math.ceil(resetMs / 1_000).toString(),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  return null;
}

/**
 * Extract client IP from request headers.
 */
export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "anonymous"
  );
}

/**
 * Simple boolean check — `true` if allowed, `false` if exceeded.
 * Uses a fixed 60-second window.
 */
export function rateLimitOk(key: string, max = 10): boolean {
  const { allowed } = rateLimit({ windowMs: 60_000, max }).check(key);
  return allowed;
}
