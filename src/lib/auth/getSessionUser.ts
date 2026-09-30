import { clerkFetch } from "@/lib/auth/clerk";
import { verifyClerkJwt } from "@/lib/auth/clerkJwt";
import type { SessionInfo, ClerkPublicMetadata } from "@/types/domain";

const API = "https://api.clerk.com/v1";

/** Clerk user shape returned from /users/:id */
interface ClerkUserResponse {
  fullName?: string;
  first_name?: string;
  email_addresses?: Array<{ email_address: string }>;
  public_metadata?: ClerkPublicMetadata;
}

/** Normalized ClerkUser returned by getClerkUser(). */
export interface ClerkUser {
  id: string;
  clerk_id: string;
  name: string;
  email: string;
  role: string;
  profileCompleted: boolean;
}

// ─── Cookie parsing helper ────────────────────────────────────────────────────

function parseCookies(cookieHeader: string): Record<string, string> {
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .filter(Boolean)
      .map((c) => {
        const [k, ...v] = c.trim().split("=");
        return [k!, v.join("=")];
      })
  );
}

// ─── Async (cryptographic) session parsing ────────────────────────────────────

/**
 * Verify the `__session` cookie via Clerk JWKS (cached).
 * Returns `{ userId, sessionId, payload }` or `null`.
 * Use this for all auth checks in API routes.
 */
export async function parseSessionToken(
  request: Request
): Promise<SessionInfo | null> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = parseCookies(cookieHeader);
  const token = cookies["__session"];
  if (!token) return null;

  const payload = await verifyClerkJwt(token);
  if (!payload) return null;

  const userId = payload.sub ?? payload.user_id;
  const sessionId = payload.sid;
  if (!userId || !sessionId) return null;
  if (typeof userId !== "string" || !userId.startsWith("user_")) return null;

  return {
    userId,
    sessionId,
    payload: payload as SessionInfo["payload"],
  };
}

// ─── Sync (structural) session parsing ───────────────────────────────────────

/**
 * Lightweight structural check — does NOT verify the JWT signature.
 * Only use where async verification is impossible (e.g., Edge runtime).
 * Prefer `parseSessionToken` for all normal auth flows.
 */
export function parseSessionTokenSync(
  request: Request
): Pick<SessionInfo, "userId" | "sessionId"> | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = parseCookies(cookieHeader);
  const token = cookies["__session"];
  if (!token) return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const header = JSON.parse(
      Buffer.from(parts[0]!, "base64url").toString()
    ) as { alg?: string };
    if (!header.alg || header.alg === "none") return null;
    if (!["RS256", "ES256", "RS384"].includes(header.alg)) return null;

    const payload = JSON.parse(
      Buffer.from(parts[1]!, "base64url").toString()
    ) as { sub?: string; user_id?: string; sid?: string; exp?: number; iat?: number };

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    if (payload.iat && payload.iat > now + 60) return null;

    const userId = payload.sub ?? payload.user_id;
    const sessionId = payload.sid;
    if (!userId || !sessionId) return null;
    if (typeof userId !== "string" || !userId.startsWith("user_")) return null;

    return { userId, sessionId };
  } catch {
    return null;
  }
}

// ─── Session liveness check ───────────────────────────────────────────────────

/**
 * Verify a Clerk session is active via a network call.
 * Only use when you need to confirm session liveness — most auth can use
 * `parseSessionToken()` without a network round-trip.
 */
export async function verifyClerkSession(
  sessionId: string,
  expectedUserId: string | null = null
): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`${API}/sessions/${sessionId}`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    });
    clearTimeout(timeout);
    if (!res.ok) return false;
    const data = (await res.json()) as {
      status?: string;
      user_id?: string;
    };
    const active = data.status === "active" || data.status === "running";
    if (!active) return false;
    if (expectedUserId && data.user_id && data.user_id !== expectedUserId) {
      return false;
    }
    return true;
  } catch {
    clearTimeout(timeout);
    return false;
  }
}

// ─── Clerk user fetch ─────────────────────────────────────────────────────────

/**
 * Fetch user data from Clerk. Returns a normalized user object.
 * Does NOT include DB data — use `getUser()` for the full profile.
 */
export async function getClerkUser(
  clerkUserId: string
): Promise<ClerkUser | null> {
  try {
    const clerkUser = (await clerkFetch(
      `/users/${clerkUserId}`
    )) as ClerkUserResponse;

    const meta = clerkUser.public_metadata ?? {};
    const email = clerkUser.email_addresses?.[0]?.email_address ?? "";

    return {
      id: clerkUserId,
      clerk_id: clerkUserId,
      name:
        clerkUser.fullName ?? clerkUser.first_name ?? email ?? "User",
      email,
      role: (meta.role as string | undefined) ?? "guest",
      profileCompleted: (meta.profileCompleted as boolean | undefined) ?? false,
    };
  } catch {
    return null;
  }
}
