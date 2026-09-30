import type { NextRequest } from "next/server";
import { requireHost } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";
import { logAudit } from "@/lib/db/audit";
import { validateCsrfOrigin } from "@/lib/csrf";

/**
 * POST /api/reviews/[id]/respond
 * Host responds to a review.
 *
 * Body:
 *   { responseText }
 *
 * Rules:
 * - Only the listing owner can respond
 * - One response per review
 * - Response max 2000 characters
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
    const { responseText } = body;
    const responseStr = responseText as string | undefined;

    if (!responseStr || responseStr.trim().length === 0) {
      return fail("responseText required", 400);
    }
    if (responseStr.length > 2000) {
      return fail("Response must be 2000 characters or fewer", 400);
    }

    // Fetch review
    const { data: review } = await supabase
      .from("reviews")
      .select("id, listing_id, host_response")
      .eq("id", id)
      .maybeSingle();

    if (!review) return fail("Review not found", 404);

    // Check for existing response
    if (review.host_response) {
      return fail("You have already responded to this review", 409);
    }

    // Verify host owns the listing
    const { data: listing } = await supabase
      .from("listings")
      .select("provider_profile_id")
      .eq("id", review.listing_id)
      .maybeSingle();

    if (!listing) return fail("Listing not found", 404);
    if (user.providerProfile?.id !== listing.provider_profile_id) {
      return fail("You do not own this listing", 403);
    }

    // Update review with response
    const { error } = await supabase
      .from("reviews")
      .update({
        host_response: (responseStr as string).trim(),
        host_responded_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    // Notify the guest
    const { data: reviewWithGuest } = await supabase
      .from("reviews")
      .select("guest_id")
      .eq("id", id)
      .maybeSingle();

    if (reviewWithGuest?.guest_id) {
      await supabase.from("notifications").insert({
        user_id: reviewWithGuest.guest_id,
        type: "review_response",
        title: "Host Responded to Your Review",
        body: `The host has responded to your review.`,
        link: `/listings/${review.listing_id}`,
        metadata: { review_id: id },
      });
    }

    await logAudit({
      actorId: user.id,
      action: "review.responded",
      resourceType: "review",
      resourceId: id,
      metadata: { listing_id: review.listing_id },
    });

    return ok({ ok: true, message: "Response added" });
  } catch (error) {
    console.error("POST /api/reviews/[id]/respond error:", error);
    return fail("Failed to add response", 500);
  }
}
