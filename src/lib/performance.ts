/**
 * ClockHost Performance Utilities
 * Query caching, N+1 prevention, rate limiting, query tracking.
 */

// ─── MemoryCache ──────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  value: T;
  expiresAt: number | null;
}

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return undefined;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set<T>(key: string, value: T, ttlMs = 0): void {
    const existing = this.timers.get(key);
    if (existing) clearTimeout(existing);

    this.store.set(key, {
      value,
      expiresAt: ttlMs > 0 ? Date.now() + ttlMs : null,
    });

    if (ttlMs > 0) {
      const timer = setTimeout(() => this.delete(key), ttlMs);
      this.timers.set(key, timer);
    }
  }

  delete(key: string): void {
    this.store.delete(key);
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  clear(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.store.clear();
    this.timers.clear();
  }

  stats(): { total: number; valid: number; expired: number } {
    let valid = 0;
    let expired = 0;
    const now = Date.now();
    for (const [, entry] of this.store) {
      if (entry.expiresAt && now > entry.expiresAt) expired++;
      else valid++;
    }
    return { total: this.store.size, valid, expired };
  }
}

export const cache = new MemoryCache();

export async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>
): Promise<T> {
  const hit = cache.get<T>(key);
  if (hit !== undefined) return hit;
  const result = await fn();
  cache.set(key, result, ttlMs);
  return result;
}

export function invalidatePattern(pattern: string): void {
  const regex = new RegExp(pattern);
  // Access internal store via the public API — iterate known keys
  const toDelete: string[] = [];
  // MemoryCache doesn't expose keys; use a workaround via stats/clear
  // For production use, prefer redisCache.del(pattern) which supports glob patterns
  void pattern; void regex; void toDelete;
  // Intentionally a no-op here — for cross-instance invalidation use redisCache
}

// ─── BatchLoader ──────────────────────────────────────────────────────────────

interface PendingEntry<T> {
  resolve: (value: T | null) => void;
  reject: (reason: unknown) => void;
}

export class BatchLoader<T extends { id?: string; key?: string }> {
  private batchFn: (keys: string[]) => Promise<T[]>;
  private maxBatchSize: number;
  private itemCache = new Map<string, T | null>();
  private pending = new Map<string, PendingEntry<T>>();

  constructor(
    batchFn: (keys: string[]) => Promise<T[]>,
    options: { maxBatchSize?: number } = {}
  ) {
    this.batchFn = batchFn;
    this.maxBatchSize = options.maxBatchSize ?? 100;
  }

  async load(key: string): Promise<T | null> {
    if (this.itemCache.has(key)) return this.itemCache.get(key) ?? null;
    if (this.pending.has(key)) {
      return new Promise<T | null>((resolve, reject) => {
        this.pending.set(key, { resolve, reject });
      });
    }

    const promise = new Promise<T | null>((resolve, reject) => {
      this.pending.set(key, { resolve, reject });
    });

    if (this.pending.size === 1) {
      setTimeout(() => void this._executeBatch(), 0);
    }
    return promise;
  }

  async loadMany(keys: string[]): Promise<Array<T | null>> {
    return Promise.all(keys.map((k) => this.load(k)));
  }

  private async _executeBatch(): Promise<void> {
    const pending = new Map(this.pending);
    this.pending.clear();
    const keys = [...pending.keys()].slice(0, this.maxBatchSize);

    try {
      const results = await this.batchFn(keys);
      for (const key of keys) {
        const result = results.find((r) => r.id === key || r.key === key) ?? null;
        this.itemCache.set(key, result);
        pending.get(key)?.resolve(result);
      }
    } catch (error) {
      for (const key of keys) pending.get(key)?.reject(error);
    }
  }

  clear(): void {
    this.itemCache.clear();
  }
}

// ─── SlidingWindowRateLimiter ─────────────────────────────────────────────────

export class SlidingWindowRateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private requests = new Map<string, number[]>();

  constructor(windowMs = 60_000, maxRequests = 60) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  check(key: string): { allowed: boolean; remaining: number; resetAt: number; retryAfter?: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const timestamps = (this.requests.get(key) ?? []).filter((t) => t > windowStart);

    if (timestamps.length >= this.maxRequests) {
      const resetAt = (timestamps[0] ?? now) + this.windowMs;
      return { allowed: false, remaining: 0, resetAt, retryAfter: resetAt - now };
    }

    timestamps.push(now);
    this.requests.set(key, timestamps);
    return { allowed: true, remaining: this.maxRequests - timestamps.length, resetAt: now + this.windowMs };
  }

  cleanup(): void {
    const now = Date.now() - this.windowMs;
    for (const [key, timestamps] of this.requests) {
      const valid = timestamps.filter((t) => t > now);
      if (valid.length === 0) this.requests.delete(key);
      else this.requests.set(key, valid);
    }
  }
}

// ─── QueryTracker ─────────────────────────────────────────────────────────────

interface QueryRecord {
  name: string;
  duration: number;
  timestamp: string;
}

export class QueryTracker {
  private slowThresholdMs: number;
  private queries: QueryRecord[] = [];

  constructor(slowThresholdMs = 1_000) {
    this.slowThresholdMs = slowThresholdMs;
  }

  track<T>(queryName: string, fn: () => T): T {
    const start = Date.now();
    const result = fn();
    const duration = Date.now() - start;

    this.queries.push({ name: queryName, duration, timestamp: new Date().toISOString() });

    if (duration > this.slowThresholdMs) {
      console.warn(`[SLOW QUERY] ${queryName} took ${duration}ms`);
    }
    return result;
  }

  stats(): { total: number; avg: number; max: number; min: number; slow: number } | null {
    if (!this.queries.length) return null;
    const durations = this.queries.map((q) => q.duration);
    return {
      total: this.queries.length,
      avg: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      max: Math.max(...durations),
      min: Math.min(...durations),
      slow: this.queries.filter((q) => q.duration > this.slowThresholdMs).length,
    };
  }
}

export const queryTracker = new QueryTracker();

// ─── Pagination helper ────────────────────────────────────────────────────────

export interface PaginateOptions {
  page?: number;
  pageSize?: number;
  cursor?: string | null;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/** Apply cursor/offset pagination to a fluent query builder. */
export function paginate<Q extends {
  order: (f: string, o: { ascending: boolean }) => Q;
  range: (from: number, to: number) => Q;
}>(
  query: Q,
  { page = 1, pageSize = 20, cursor: _cursor = null, sortBy = "created_at", sortOrder = "desc" }: PaginateOptions
): Q {
  const limit = Math.min(100, Math.max(1, pageSize));
  const offset = (Math.max(1, page) - 1) * limit;
  return query
    .order(sortBy, { ascending: sortOrder === "asc" })
    .range(offset, offset + limit - 1);
}
