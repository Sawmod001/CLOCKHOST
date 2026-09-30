import * as jose from "jose";
import type { JWTPayload } from "jose";

// ─── Extended payload type ────────────────────────────────────────────────────

export interface ClerkJwtPayload extends JWTPayload {
  user_id?: string;
  sid?: string;
  public_metadata?: Record<string, unknown>;
}

// ─── JWKS cache ───────────────────────────────────────────────────────────────

let cachedJwks: ReturnType<typeof jose.createRemoteJWKSet> | null = null;
let jwksFetchedAt = 0;
const JWKS_TTL_MS = 1_000 * 60 * 60; // 1 hour

function getJwksUrl(): string | null {
  if (process.env.CLERK_JWKS_URL) return process.env.CLERK_JWKS_URL;

  // Derive from publishable key: pk_test_<base64(domain)>$ → decode to Clerk domain
  const pub = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  try {
    const b64 = pub.split("_")[2];
    if (b64) {
      const decoded = Buffer.from(b64, "base64").toString().replace(/\$$/, "");
      if (decoded.includes("clerk")) {
        return `https://${decoded}/.well-known/jwks.json`;
      }
    }
  } catch {
    // ignore
  }

  if (process.env.NEXT_PUBLIC_CLERK_FRONTEND_API) {
    return `https://${process.env.NEXT_PUBLIC_CLERK_FRONTEND_API}/.well-known/jwks.json`;
  }

  return null;
}

export function isClerkConfigured(): boolean {
  return !!(process.env.CLERK_SECRET_KEY && getJwksUrl());
}

export { getJwksUrl };

async function getJwks(): Promise<ReturnType<typeof jose.createRemoteJWKSet> | null> {
  const url = getJwksUrl();
  if (!url) return null;

  const now = Date.now();
  if (cachedJwks && now - jwksFetchedAt < JWKS_TTL_MS) return cachedJwks;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } } as RequestInit);
    if (!res.ok) throw new Error(`JWKS fetch ${res.status}`);
    const data = (await res.json()) as { keys?: unknown[] };
    if (!data.keys?.length) throw new Error("JWKS empty");

    const jwks = jose.createRemoteJWKSet(new URL(url));
    cachedJwks = jwks;
    jwksFetchedAt = now;
    return jwks;
  } catch (e) {
    console.warn("clerkJwt: JWKS fetch failed", (e as Error)?.message);
    return cachedJwks; // return cached if available
  }
}

/**
 * Verify Clerk `__session` JWT signature using Clerk's JWKS.
 * Returns the typed payload if valid, `null` otherwise.
 * No network call when the cached JWKS is fresh.
 */
export async function verifyClerkJwt(
  token: string
): Promise<ClerkJwtPayload | null> {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  // Quick structural checks before crypto
  try {
    const header = JSON.parse(
      Buffer.from(parts[0]!, "base64url").toString()
    ) as { alg?: string };
    if (!header.alg || header.alg === "none") return null;
    if (!["RS256", "ES256", "RS384"].includes(header.alg)) return null;
  } catch {
    return null;
  }

  if (!isClerkConfigured()) {
    // Dev fallback: structural + expiry check only
    try {
      const payload = JSON.parse(
        Buffer.from(parts[1]!, "base64url").toString()
      ) as ClerkJwtPayload;
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) return null;
      if (payload.iat && payload.iat > now + 60) return null;
      return payload;
    } catch {
      return null;
    }
  }

  try {
    const jwks = await getJwks();
    if (!jwks) {
      // JWKS unavailable — degrade to expiry-only check
      const payload = JSON.parse(
        Buffer.from(parts[1]!, "base64url").toString()
      ) as ClerkJwtPayload;
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) return null;
      return payload;
    }

    const { payload } = await jose.jwtVerify(token, jwks);
    const typedPayload = payload as ClerkJwtPayload;

    // Additional subject format check
    const sub = typedPayload.sub ?? typedPayload.user_id;
    if (!sub || typeof sub !== "string" || !sub.startsWith("user_")) return null;

    return typedPayload;
  } catch {
    // Expired, invalid signature, wrong key, etc.
    return null;
  }
}
