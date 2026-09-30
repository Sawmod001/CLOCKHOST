import type { NextRequest } from "next/server";
import { requireHost } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";
import { logAudit } from "@/lib/db/audit";
import { validateCsrfOrigin } from "@/lib/csrf";

/**
 * POST /api/listings/[id]/blocked-dates/bulk
 * Bulk block or unblock a date range.
 *
 * Body:
 *   { action: 'block' | 'unblock', startDate, endDate, reason? }
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const userOrResponse = await requireHost(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { id } = await context.params;
    const body = (await request.json() as Record<string, unknown>);
    const { action, startDate, endDate, reason } = body;

    if (!action || !startDate || !endDate) {
      return fail("action, startDate, and endDate required", 400);
    }

    if (!["block", "unblock"].includes(action as string)) {
      return fail("action must be 'block' or 'unblock'", 400);
    }

    // Verify listing is housing
    const { data: listing } = await supabase
      .from("listings")
      .select("id, vertical, provider_profile_id")
      .eq("id", id)
      .maybeSingle();

    if (!listing) return fail("Listing not found", 404);
    if (listing.vertical !== "housing") return fail("Calendar is only for housing listings", 400);

    // Verify ownership
    const { data: profile } = await supabase
      .from("provider_profiles")
      .select("id")
      .eq("id", listing.provider_profile_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) return fail("You do not own this listing", 403);

    let result;
    if (action === "block") {
      const { data } = await supabase
        .rpc("bulk_block_dates", {
          p_listing_id: id,
          p_host_id: user.id,
          p_start_date: startDate,
          p_end_date: endDate,
          p_reason: reason || "host_blocked",
        })
        .single();
      result = data;
    } else {
      const { data } = await supabase
        .rpc("bulk_unblock_dates", {
          p_listing_id: id,
          p_host_id: user.id,
          p_start_date: startDate,
          p_end_date: endDate,
        })
        .single();
      result = data;
    }

    if (!result?.ok) {
      return fail(result?.error || "Failed to process dates", 400);
    }

    await logAudit({
      actorId: user.id,
      action: `blocked_dates.bulk_${action}`,
      resourceType: "listing",
      resourceId: id,
      metadata: { startDate, endDate, reason, ...result },
    });

    return ok({ ok: true, data: result });
  } catch (error) {
    console.error("POST /api/listings/[id]/blocked-dates/bulk error:", error);
    return fail("Failed to process bulk dates", 500);
  }
}
