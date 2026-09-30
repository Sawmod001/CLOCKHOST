import type { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";
import { validateCsrfOrigin } from "@/lib/csrf";

/**
 * POST /api/users/block
 * Block a user.
 *
 * Body:
 *   { userId, reason? }
 */
export async function POST(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const userOrResponse = await requireAuthenticatedUser(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const body = (await request.json() as Record<string, unknown>);
    const { userId, reason } = body;

    if (!userId) return fail("userId required", 400);
    if (userId === user.id) return fail("Cannot block yourself", 400);

    // Check if already blocked
    const { data: existing } = await supabase
      .from("blocked_users")
      .select("id")
      .eq("blocker_id", user.id)
      .eq("blocked_id", userId)
      .maybeSingle();

    if (existing) return fail("User is already blocked", 409);

    const { error } = await supabase
      .from("blocked_users")
      .insert({
        blocker_id: user.id,
        blocked_id: userId,
        reason: reason || null,
      });

    if (error) throw error;

    return ok({ ok: true, message: "User blocked" });
  } catch (error) {
    console.error("POST /api/users/block error:", error);
    return fail("Failed to block user", 500);
  }
}

/**
 * DELETE /api/users/block?userId=xxx
 * Unblock a user.
 */
export async function DELETE(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const userOrResponse = await requireAuthenticatedUser(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) return fail("userId required", 400);

    const { error } = await supabase
      .from("blocked_users")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", userId);

    if (error) throw error;

    return ok({ ok: true, message: "User unblocked" });
  } catch (error) {
    console.error("DELETE /api/users/block error:", error);
    return fail("Failed to unblock user", 500);
  }
}

/**
 * GET /api/users/block
 * List users blocked by the current user.
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAuthenticatedUser(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { data: blocks, error } = await supabase
      .from("blocked_users")
      .select(`
        id, blocked_id, reason, created_at,
        blocked:blocked_id(id, full_name, email)
      `)
      .eq("blocker_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return ok({ ok: true, data: blocks || [] });
  } catch (error) {
    console.error("GET /api/users/block error:", error);
    return fail("Failed to fetch blocked users", 500);
  }
}
