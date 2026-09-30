/**
 * CSRF protection via Origin / Referer header validation.
 *
 * Modern best practice (2025-2026):
 * - SameSite=Lax cookies prevent cross-origin POST requests from including cookies.
 * - Origin/Referer checks provide defense-in-depth for older browsers.
 * - CSRF tokens are unnecessary when:
 *   (a) cookies are SameSite=Lax, AND
 *   (b) endpoints only accept application/json (not form-encoded).
 */

function getAllowedOrigins(): string[] {
  const raw: Array<string | undefined> = [
    process.env.CLOCKHOST_BASE_URL,
    process.env.HOSTME_BASE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : undefined,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];

  const expanded: string[] = [];
  for (const entry of raw) {
    if (!entry) continue;
    for (const part of entry.split(",")) {
      const trimmed = part.trim().replace(/\/$/, "");
      if (trimmed) expanded.push(trimmed);
    }
  }
  return [...new Set(expanded)];
}

function normalizeOrigin(urlStr: string): string | null {
  try {
    const u = new URL(urlStr);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

function isAllowedOrigin(
  originBase: string,
  allowedOrigins: string[],
  requestHost: string
): boolean {
  if (allowedOrigins.includes(originBase)) return true;
  // Same-host: origin host equals request Host header (covers preview deployments, custom domains).
  // Strict equality only — no wildcard .vercel.app bypass.
  if (requestHost) {
    try {
      const originHost = new URL(originBase).host;
      if (originHost === requestHost) return true;
    } catch {
      // ignore
    }
  }
  return false;
}

/**
 * Validate that a state-changing request came from a trusted origin.
 * Returns a 403 Response on failure, `null` on success.
 */
export function validateCsrfOrigin(request: Request): Response | null {
  const method = request.method;
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return null;

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host =
    request.headers.get("host") ??
    request.headers.get("x-forwarded-host") ??
    "";

  const allowedOrigins = getAllowedOrigins();

  if (origin) {
    const originBase = normalizeOrigin(origin);
    if (!originBase) {
      return new Response(
        JSON.stringify({ error: "CSRF validation failed: malformed origin" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!isAllowedOrigin(originBase, allowedOrigins, host)) {
      return new Response(
        JSON.stringify({ error: "CSRF validation failed: invalid origin" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
    return null;
  }

  if (referer) {
    const refererBase = normalizeOrigin(referer);
    if (!refererBase) {
      return new Response(
        JSON.stringify({ error: "CSRF validation failed: malformed referer" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!isAllowedOrigin(refererBase, allowedOrigins, host)) {
      return new Response(
        JSON.stringify({ error: "CSRF validation failed: invalid referer" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
    return null;
  }

  // Neither Origin nor Referer — if a session cookie is present, reject (likely forged).
  const hasSessionCookie = (request.headers.get("cookie") ?? "").includes("__session");
  if (hasSessionCookie) {
    return new Response(
      JSON.stringify({ error: "CSRF validation failed: missing origin and referer" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // No session cookie + no origin/referer — likely a non-browser client (curl, webhook) — allow.
  return null;
}
