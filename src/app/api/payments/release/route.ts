import type { NextRequest } from "next/server";
import { requireHost } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail, parseId } from "@/lib/db/supabase-utils";
import { logAudit } from "@/lib/db/audit";
import { validateCsrfOrigin } from "@/lib/csrf";

/**
 * POST /api/payments/release
 * Release escrowed funds to host after booking completion.
 *
 * Body:
 *   { bookingId }
 *
 * Rules:
 * - Only host can release (after marking booking completed)
 * - Booking must be completed
 * - Payment must be successful and held in escrow
 */
export async function POST(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const userOrResponse = await requireHost(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const body = (await request.json() as Record<string, unknown>);
    const { bookingId } = body;

    if (!bookingId) return fail("bookingId required", 400);
    if (!parseId(bookingId)) return fail("Invalid booking ID", 400);

    // Fetch booking
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, listing_id, status, guest_id, booking_type, total_amount_kobo")
      .eq("id", bookingId)
      .maybeSingle();

    if (!booking) return fail("Booking not found", 404);
    if (booking.status !== "completed") return fail("Booking must be completed before releasing funds", 400);

    // Verify host owns the listing
    const { data: listing } = await supabase
      .from("listings")
      .select("provider_profile_id")
      .eq("id", booking.listing_id)
      .maybeSingle();

    if (!listing) return fail("Listing not found", 404);
    if (user.providerProfile?.id !== listing.provider_profile_id) {
      return fail("You do not own this listing", 403);
    }

    // Call the release_escrow function
    const { data: result } = await supabase
      .rpc("release_escrow", {
        p_booking_id: bookingId,
        p_actor_id: user.id,
      })
      .single();

    if (!result?.ok) {
      return fail(result?.error || "Failed to release escrow", 400);
    }

    await logAudit({
      actorId: user.id,
      action: "escrow.released",
      resourceType: "booking",
      resourceId: bookingId as string,
      metadata: {
        release_id: result.release_id,
        host_payout_kobo: result.host_payout_kobo,
        platform_fee_kobo: result.platform_fee_kobo,
      },
    });

    return ok({
      ok: true,
      data: {
        releaseId: result.release_id,
        hostPayoutKobo: result.host_payout_kobo,
        platformFeeKobo: result.platform_fee_kobo,
      },
    });
  } catch (error) {
    console.error("POST /api/payments/release error:", error);
    return fail("Failed to release funds", 500);
  }
}
