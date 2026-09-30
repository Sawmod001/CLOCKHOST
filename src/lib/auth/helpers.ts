import { parseSessionToken } from "@/lib/auth/getSessionUser";
import { getUser } from "@/lib/auth/getUser";
import { fail } from "@/lib/db/supabase-utils";
import type { AppUser } from "@/types/domain";

/**
 * Require an authenticated user with a valid Clerk session.
 * Returns the full AppUser or a NextResponse-compatible error Response.
 *
 * @example
 * const userOrResponse = await requireAuthenticatedUser(request);
 * if (userOrResponse instanceof Response) return userOrResponse;
 * const user = userOrResponse; // typed as AppUser
 */
export async function requireAuthenticatedUser(
  request: Request
): Promise<AppUser | Response> {
  const sessionInfo = await parseSessionToken(request);
  if (!sessionInfo?.userId) return fail("Unauthorized", 401);

  try {
    const user = await getUser(sessionInfo.userId);
    if (!user) return fail("User not found", 404);
    return user;
  } catch (e) {
    const msg = (e as Error)?.message ?? "";
    if (/ECONN|ETIMEDOUT|ENOTFOUND|timeout/i.test(msg)) {
      return fail("Authentication service temporarily unavailable", 503);
    }
    throw e;
  }
}

/**
 * Require the authenticated user to have a host role (venue_host or shortlet_host).
 * Returns the full AppUser or an error Response.
 */
export async function requireHost(
  request: Request
): Promise<AppUser | Response> {
  const userOrResponse = await requireAuthenticatedUser(request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const user = userOrResponse;
  if (user.role !== "venue_host" && user.role !== "shortlet_host") {
    return fail("Host account required", 403);
  }
  return user;
}

/**
 * Require the authenticated user to be an admin.
 * Returns the full AppUser or an error Response.
 */
export async function requireAdmin(
  request: Request
): Promise<AppUser | Response> {
  const userOrResponse = await requireAuthenticatedUser(request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const user = userOrResponse;
  if (user.role !== "admin") {
    return fail("Admin access required", 403);
  }
  return user;
}
