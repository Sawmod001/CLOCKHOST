import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { toCamelCase, ok, fail } from "@/lib/db/supabase-utils";
import { validateCsrfOrigin } from "@/lib/csrf";
import { logAudit } from "@/lib/db/audit";
import { notifyListingDecision } from "@/lib/notifications";

/**
 * GET /api/admin/listings/review
 * List listings pending admin review.
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAdmin(request);
    if (userOrResponse instanceof Response) return userOrResponse;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "submitted";
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    const selectWithCount = supabase.from("listings").select as unknown as (
      cols: string,
      opts?: unknown
    ) => ReturnType<typeof supabase.from>;
    const { data: listings, error, count } = (await selectWithCount(
      "*, provider_profiles(id, user_id, business_name, display_name)",
      { count: "exact" }
    )
      .eq("status", status)
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1)) as unknown as {
      data: Record<string, unknown>[] | null;
      error: { message: string } | null;
      count: number | null;
    };

    if (error) throw error;

    return ok({ data: (listings || []).map(toCamelCase), total: count || 0 });
  } catch (error) {
    console.error("GET /api/admin/listings/review error:", error);
    return fail("Failed to fetch listings for review", 500);
  }
}

interface ReviewPayload {
  listingId?: unknown;
  decision?: unknown;
  reason?: unknown;
}

/**
 * POST /api/admin/listings/review
 * Approve or reject a listing.
 *
 * Body:
 *   { listingId, decision: 'approved' | 'rejected', reason? }
 */
export async function POST(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const userOrResponse = await requireAdmin(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const payload = (await request.json()) as ReviewPayload;
    const { listingId, decision, reason } = payload;

    if (!listingId) return fail("Listing ID is required", 400);
    if (!["approved", "rejected"].includes(decision as string)) return fail("Decision must be 'approved' or 'rejected'", 400);

    const { data: listingRaw, error: fetchError } = await supabase
      .from("listings")
      .select("id, title, status, provider_profile_id")
      .eq("id", listingId as string)
      .maybeSingle();

    const listing = listingRaw as unknown as {
      id: string;
      title: string;
      status: string;
      provider_profile_id: string;
    } | null;

    if (fetchError || !listing) return fail("Listing not found", 404);
    if (!["submitted", "under_review"].includes(listing.status as string)) {
      return fail(`Listing is in "${listing.status as string}" state and cannot be reviewed`, 400);
    }

    const newStatus = decision === "approved" ? "active" : "rejected";

    const { error: updateError } = await supabase
      .from("listings")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...(decision === "rejected" && reason ? { rejection_reason: reason as string } : {}),
      })
      .eq("id", listingId as string);

    if (updateError) throw updateError;

    // Fetch provider user ID for notification
    const { data: profileRaw } = await supabase
      .from("provider_profiles")
      .select("user_id")
      .eq("id", listing.provider_profile_id as string)
      .maybeSingle();

    const profile = profileRaw as unknown as { user_id?: string } | null;

    if (profile?.user_id) {
      await notifyListingDecision({
        hostId: profile.user_id as string,
        listingTitle: listing.title as string,
        listingId: listingId as string,
        decision: decision as "approved" | "rejected",
      });
    }

    await logAudit({
      actorId: user.id,
      action: `listing.${decision as string}`,
      resourceType: "listing",
      resourceId: listingId as string,
      metadata: { from_status: listing.status, to_status: newStatus, reason: (reason as string | undefined) || null },
    });

    return ok({ ok: true, data: { listingId, status: newStatus } });
  } catch (error) {
    console.error("POST /api/admin/listings/review error:", error);
    return fail("Failed to review listing", 500);
  }
}
