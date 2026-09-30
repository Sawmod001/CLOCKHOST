import type { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";

/**
 * GET /api/bookings/[id]/snapshot
 * Get the pricing and terms snapshot for a booking.
 * Used by both guests and hosts to see what was agreed at booking time.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const userOrResponse = await requireAuthenticatedUser(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { id } = await context.params;

    const { data: booking } = await supabase
      .from("bookings")
      .select(`
        id, listing_id, guest_id, booking_type, status,
        event_start, event_end, headcount,
        total_amount_kobo, commission_kobo,
        pricing_snapshot, terms_snapshot, created_at
      `)
      .eq("id", id)
      .maybeSingle();

    if (!booking) {
      return fail("Booking not found", 404);
    }

    // Authorization: guest or host
    const isGuest = booking.guest_id === user.id;
    let isHost = false;

    if (!isGuest) {
      const { data: listing } = await supabase
        .from("listings")
        .select("provider_profile_id")
        .eq("id", booking.listing_id)
        .maybeSingle();

      if (listing && user.providerProfile?.id === listing.provider_profile_id) {
        isHost = true;
      }
    }

    // Admin check
    const isAdmin = user.role === "admin";

    if (!isGuest && !isHost && !isAdmin) {
      return fail("Not authorized to view this snapshot", 403);
    }

    // Get price breakdown using the database function
    const { data: breakdown } = await supabase
      .rpc("get_booking_price_breakdown", { p_booking_id: id })
      .single();

    // Get snapshot audit history
    const { data: auditHistory } = await supabase
      .from("booking_snapshot_audit")
      .select("id, change_type, changed_at, reason")
      .eq("booking_id", id)
      .order("changed_at", { ascending: false })
      .limit(10);

    return ok({
      ok: true,
      data: {
        bookingId: booking.id,
        bookingType: booking.booking_type,
        status: booking.status,
        createdAt: booking.created_at,
        pricingSnapshot: booking.pricing_snapshot,
        termsSnapshot: booking.terms_snapshot,
        priceBreakdown: breakdown,
        auditHistory: auditHistory || [],
      },
    });
  } catch (error) {
    console.error("GET /api/bookings/[id]/snapshot error:", error);
    return fail("Failed to fetch snapshot", 500);
  }
}
