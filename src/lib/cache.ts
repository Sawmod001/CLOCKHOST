/**
 * ClockHost Caching Strategy
 * Response headers, stale-while-revalidate presets, Redis adapter.
 */

import { NextResponse } from "next/server";
import crypto from "crypto";

// ─── Cache-Control presets ────────────────────────────────────────────────────

export const CACHE_PRESETS = {
  noStore: {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
  },
  short: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
  medium: { "Cache-Control": "public, max-age=300, stale-while-revalidate=1800" },
  long: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=21600" },
  day: { "Cache-Control": "public, max-age=86400" },
  week: { "Cache-Control": "public, max-age=604800" },
  private: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" },
  privateShort: { "Cache-Control": "private, max-age=30, stale-while-revalidate=120" },
  immutable: { "Cache-Control": "public, max-age=31536000, immutable" },
  cdnOnly: {
    "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=1800",
  },
} as const;

export type CachePreset = (typeof CACHE_PRESETS)[keyof typeof CACHE_PRESETS];

export function withCache(
  response: NextResponse,
  preset: CachePreset = CACHE_PRESETS.noStore,
  extra: Record<string, string> = {}
): NextResponse {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(preset)) headers.set(k, v);
  for (const [k, v] of Object.entries(extra)) headers.set(k, v);
  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

type RouteHandler = (request: Request, context: unknown) => Promise<Response>;

export function withCacheHandler(
  handler: RouteHandler,
  preset: CachePreset = CACHE_PRESETS.noStore
): RouteHandler {
  return async (request, context) => {
    const response = await handler(request, context);
    if (response instanceof NextResponse) return withCache(response, preset);
    return response;
  };
}

export function generateETag(content: unknown): string {
  return crypto
    .createHash("md5")
    .update(typeof content === "string" ? content : JSON.stringify(content))
    .digest("hex");
}

export function checkETag(request: Request, etag: string): boolean {
  const ifNoneMatch = request.headers.get("if-none-match");
  return !!ifNoneMatch && ifNoneMatch === etag;
}

// ─── Redis cache adapter ──────────────────────────────────────────────────────

interface CacheEntry<T> {
  value: T;
  expiresAt: number | null;
}

export class RedisCache {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private redis: any = null;
  private memoryCache = new Map<string, CacheEntry<unknown>>();

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    try {
      if (process.env.REDIS_URL) {
        // ioredis is an optional dependency (not installed) — webpackIgnore keeps
        // the bundler from resolving it, the string cast keeps tsc quiet;
        // failure falls back to memory cache.
        const { default: Redis } = (await import(
          /* webpackIgnore: true */ "ioredis" as string
        )) as {
          default: new (url: string, opts?: Record<string, unknown>) => unknown;
        };
        this.redis = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times: number) => Math.min(times * 100, 3_000),
        });
        (this.redis as { on: (e: string, cb: (err: Error) => void) => void }).on(
          "error",
          (err: Error) => {
            console.error("[Redis] Error:", err.message);
            this.redis = null;
          }
        );
      }
    } catch {
      console.warn("[Redis] Not available, using memory cache");
      this.redis = null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.redis) {
      try {
        const value: string | null = await (this.redis as { get: (k: string) => Promise<string | null> }).get(key);
        return value ? (JSON.parse(value) as T) : null;
      } catch {
        return null;
      }
    }
    const entry = this.memoryCache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    return entry.value;
  }

  async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    if (this.redis) {
      try {
        await (this.redis as { setex: (k: string, t: number, v: string) => Promise<void> }).setex(
          key,
          ttlSeconds,
          JSON.stringify(value)
        );
        return;
      } catch {
        // fall through
      }
    }
    this.memoryCache.set(key, {
      value,
      expiresAt: ttlSeconds > 0 ? Date.now() + ttlSeconds * 1_000 : null,
    });
  }

  async del(pattern: string): Promise<void> {
    if (this.redis) {
      try {
        const keys: string[] = await (this.redis as { keys: (p: string) => Promise<string[]> }).keys(pattern);
        if (keys.length > 0) {
          await (this.redis as { del: (...k: string[]) => Promise<void> }).del(...keys);
        }
        return;
      } catch {
        // fall through
      }
    }
    const regex = new RegExp(pattern.replace("*", ".*"));
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) this.memoryCache.delete(key);
    }
  }

  async stats(): Promise<Record<string, unknown>> {
    if (this.redis) {
      try {
        const info: string = await (this.redis as { info: (s: string) => Promise<string> }).info("stats");
        return { backend: "redis", info };
      } catch {
        return { backend: "redis", error: "unavailable" };
      }
    }
    return { backend: "memory", keys: this.memoryCache.size };
  }
}

export const redisCache = new RedisCache();

export const cacheKeys = {
  listing: (id: string) => `listing:${id}`,
  listingAvailability: (id: string, date: string) => `listing:${id}:avail:${date}`,
  listingSearch: (query: string) => `search:${query}`,
  userProfile: (id: string) => `user:${id}`,
  hostEarnings: (id: string) => `host:earnings:${id}`,
  adminStats: () => `admin:stats`,
  reviewSummary: (listingId: string) => `reviews:${listingId}`,
  notifications: (userId: string) => `notifications:${userId}`,
  calendar: (listingId: string, month: string) => `calendar:${listingId}:${month}`,
};

export async function warmCache(
  sb: { from: (t: string) => unknown }
): Promise<void> {
  console.warn("[Cache] Warming cache...");
  try {
    const q = (
      (sb.from("listings") as Record<string, unknown>)["select"] as (
        s: string
      ) => Record<string, unknown>
    )("id, title, city, category, price_kobo");
    const eq = (q as Record<string, unknown>)["eq"] as unknown as
      | ((key: string, value: unknown) => Record<string, unknown>)
      | undefined;
    const res = (await eq?.("is_active", true)) as {
      data?: Array<{ id: string }>;
    };
    for (const listing of res?.data ?? []) {
      await redisCache.set(cacheKeys.listing(listing.id), listing, 3_600);
    }
  } catch (error) {
    console.error("[Cache] Warm failed:", (error as Error).message);
  }
}
