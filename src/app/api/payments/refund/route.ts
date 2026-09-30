import type { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail, parseId } from "@/lib/db/supabase-utils";
import { logAudit } from "@/lib/db/audit";
import { validateCsrfOrigin } from "@/lib/csrf";

/**
 * POST /api/payments/refund
 * Request a refund for a cancelled booking.
 *
 * Body:
 *   { bookingId, reason? }
 *
 * Rules:
 * - Guest can request refund for their own cancelled bookings
 * - Admin can refund any booking
 * - Refund amount is calculated by the refund_booking function based on policy
 */
export async function POST(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const userOrResponse = await requireAuthenticatedUser(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const body = (await request.json() as Record<string, unknown>);
    const { bookingId, reason = "guest_cancelled" } = body;

    if (!bookingId) return fail("bookingId required", 400);
    if (!parseId(bookingId)) return fail("Invalid booking ID", 400);

    // Fetch booking
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, guest_id, status, listing_id, total_amount_kobo")
      .eq("id", bookingId)
      .maybeSingle();

    if (!booking) return fail("Booking not found", 404);

    // Determine actor role
    const isGuest = booking.guest_id === user.id;
    const isAdmin = user.role === "admin";
    let actorRole = "guest";

    if (isAdmin) {
      actorRole = "admin";
    } else if (!isGuest) {
      // Check if host
      const { data: listing } = await supabase
        .from("listings")
        .select("provider_profile_id")
        .eq("id", booking.listing_id)
        .maybeSingle();

      if (listing && user.providerProfile?.id === listing.provider_profile_id) {
        actorRole = "host";
      } else {
        return fail("Not authorized to request refund", 403);
      }
    }

    // Booking must be cancelled to get a refund
    if (booking.status !== "cancelled") {
      return fail("Booking must be cancelled before requesting a refund", 400);
    }

    // Check if refund already exists
    const { data: existingRefund } = await supabase
      .from("refund_records")
      .select("id, status")
      .eq("booking_id", bookingId)
      .in("status", ["pending", "processing", "completed"])
      .maybeSingle();

    if (existingRefund) {
      return fail("Refund already exists for this booking", 409);
    }

    // Call refund_booking function
    const { data: result } = await supabase
      .rpc("refund_booking", {
        p_booking_id: bookingId,
        p_actor_id: user.id,
        p_actor_role: actorRole,
        p_reason: reason,
      })
      .single();

    if (!result?.ok) {
      return fail(result?.error || "Failed to process refund", 400);
    }

    await logAudit({
      actorId: user.id,
      action: "refund.requested",
      resourceType: "booking",
      resourceId: bookingId as string,
      metadata: {
        refund_amount_kobo: result.refund_amount_kobo,
        cancellation_policy: result.cancellation_policy,
        refund_id: result.refund_id,
        reason,
      },
    });

    return ok({
      ok: true,
      data: {
        refundId: result.refund_id,
        refundAmountKobo: result.refund_amount_kobo,
        cancellationPolicy: result.cancellation_policy,
      },
    });
  } catch (error) {
    console.error("POST /api/payments/refund error:", error);
    return fail("Failed to process refund", 500);
  }
}
