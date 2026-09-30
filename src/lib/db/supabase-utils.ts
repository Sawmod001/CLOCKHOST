/**
 * HTTP response helpers and data-transformation utilities for API routes.
 */

// JSONB columns whose keys must not be recursively camelCased.
const JSONB_COLUMNS = new Set([
  "pricing",
  "location",
  "operational_rules",
  "features",
  "profile",
  "add_ons",
  "media",
]);

/** Transforms top-level snake_case keys to camelCase for API responses. */
export function toCamelCase<T = unknown>(obj: unknown): T {
  if (!obj || typeof obj !== "object") return obj as T;
  if (Array.isArray(obj)) return obj.map(toCamelCase) as unknown as T;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const newKey = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    const doNotRecurse =
      JSONB_COLUMNS.has(key) ||
      Array.isArray(value) ||
      value instanceof Date;
    result[newKey] =
      value && typeof value === "object" && !doNotRecurse
        ? toCamelCase(value)
        : value;
  }
  return result as T;
}

/** 200 OK response. */
export function ok(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

/**
 * Public GET response — cached at Vercel's edge CDN.
 * stale-while-revalidate keeps serving stale data while a single background
 * invocation refreshes, cutting serverless invocations on the Hobby plan.
 */
export function cachedOk(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}

/** Private (user-specific) response — never cached. */
export function privateOk(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

/** 4xx/5xx error response. */
export function fail(error: unknown, status = 400): Response {
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null
      ? (error as { message?: string }).message ?? JSON.stringify(error)
      : String(error || "Something went wrong");
  return Response.json({ error: msg }, { status });
}

/** 404 Not Found. */
export function notFound(msg = "Not found"): Response {
  return Response.json({ error: msg }, { status: 404 });
}

/** 401 Unauthorized. */
export function unauthorised(msg = "Unauthorized"): Response {
  return Response.json({ error: msg }, { status: 401 });
}

/** 403 Forbidden. */
export function forbidden(msg = "Forbidden"): Response {
  return Response.json({ error: msg }, { status: 403 });
}

/**
 * Validate a UUID string.
 * Returns the id if valid, null otherwise.
 */
export function parseId(id: unknown): string | null {
  if (typeof id !== "string") return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ? id
    : null;
}
