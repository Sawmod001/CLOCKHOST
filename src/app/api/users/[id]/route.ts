import type { NextRequest } from "next/server";
import { findUserById, findProviderProfileById } from "@/lib/db/supabase-queries";
import { parseSessionToken, verifyClerkSession, getClerkUser } from "@/lib/auth/getSessionUser";
import { toCamelCase, ok, fail, notFound, unauthorised, forbidden, parseId } from "@/lib/db/supabase-utils";
import { supabase } from "@/lib/db/supabase";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const p = await context.params;
    const sessionInfo = await parseSessionToken(request);
    if (!sessionInfo?.userId) return unauthorised("No session");
    const isValid = await verifyClerkSession(sessionInfo.sessionId, sessionInfo.userId);
    if (!isValid) return unauthorised("Invalid session");

    const adminUser = await getClerkUser(sessionInfo.userId);
    if (!adminUser) return unauthorised("Clerk user not found");
    if (adminUser.role !== "admin") return forbidden("Admin role required");

    if (!parseId(p.id)) return fail("Invalid user ID", 400);

    // First try direct user lookup
    let user = await findUserById(p.id);

    // If not found, try as provider profile ID
    if (!user) {
      const providerProfile = await findProviderProfileById(p.id);
      if (providerProfile) {
        user = await findUserById(providerProfile.user_id);
      }
    }

    if (!user) return notFound("User not found");

    return ok({
      data: toCamelCase({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profile: user.profile,
      }),
    });
  } catch (error) {
    console.error("GET /api/users/[id] error:", error);
    return fail("Failed to fetch user", 500);
  }
}
