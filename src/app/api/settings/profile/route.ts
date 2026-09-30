import type { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";
import { validateCsrfOrigin } from "@/lib/csrf";

/**
 * GET /api/settings/profile
 * Get current user's profile settings.
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAuthenticatedUser(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { data: profile } = await supabase
      .from("users")
      .select("id, full_name, email, phone, role, avatar_url, bio, timezone, language, created_at")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) return fail("User not found", 404);

    return ok({ ok: true, data: profile });
  } catch (error) {
    console.error("GET /api/settings/profile error:", error);
    return fail("Failed to fetch profile", 500);
  }
}

/**
 * PATCH /api/settings/profile
 * Update user profile settings.
 *
 * Body:
 *   { fullName?, bio?, timezone?, language?, avatarUrl? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const userOrResponse = await requireAuthenticatedUser(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const body = (await request.json() as Record<string, unknown>);
    const updates: Record<string, unknown> = {};

    if (body.fullName !== undefined) {
      if (typeof body.fullName !== "string" || (body.fullName as string).trim().length < 2) {
        return fail("fullName must be at least 2 characters", 400);
      }
      updates.full_name = (body.fullName as string).trim();
    }

    if (body.bio !== undefined) {
      if (body.bio && (body.bio as string).length > 1000) {
        return fail("bio must be 1000 characters or fewer", 400);
      }
      updates.bio = (body.bio as string) || null;
    }

    if (body.timezone !== undefined) {
      updates.timezone = body.timezone as string;
    }

    if (body.language !== undefined) {
      const validLangs = ["en", "ha", "yo", "ig", "pcm"];
      if (!validLangs.includes(body.language as string)) {
        return fail(`language must be one of: ${validLangs.join(", ")}`, 400);
      }
      updates.language = body.language as string;
    }

    if (body.avatarUrl !== undefined) {
      updates.avatar_url = (body.avatarUrl as string) || null;
    }

    if (Object.keys(updates).length === 0) {
      return fail("No valid fields to update", 400);
    }

    const { data: updated, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", user.id)
      .select("id, full_name, email, phone, role, avatar_url, bio, timezone, language")
      .single();

    if (error) throw error;

    return ok({ ok: true, data: updated });
  } catch (error) {
    console.error("PATCH /api/settings/profile error:", error);
    return fail("Failed to update profile", 500);
  }
}
