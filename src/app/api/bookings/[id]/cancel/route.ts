import type { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/helpers";
import { toCamelCase, ok, fail, parseId } from "@/lib/db/supabase-utils";
import { transitionBooking } from "@/lib/bookings/state-machine";
import { notifyBookingCancelled } from "@/lib/notifications";
import { supabase } from "@/lib/db/supabase";
import { validateCsrfOrigin } from "@/lib/csrf";

/**
 * POST /api/bookings/[id]/cancel
 * Cancel a booking. Guest or host can cancel.
 *
 * Body:
 *   { reason? }
 *
 * Rules:
 * - Guest can cancel: awaiting_payment, confirmed
 * - Host can cancel: confirmed
 * - System can cancel: awaiting_payment (expired), pending (expired)
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const { id } = await context.params;
    const userOrResponse = await requireAuthenticatedUser(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    if (!parseId(id)) return fail("Invalid booking ID", 400);

    const body = (await request.json().catch(() => ({}) as Record<string, unknown>)) as Record<string, unknown>;
    const reason = (body?.reason as string | null) || null;

    // Determine actor role
    const { data: bookingRaw } = await supabase
      .from("bookings")
      .select("id, guest_id, listing_id, host_id")
      .eq("id", id)
      .maybeSingle();

    const booking = bookingRaw as unknown as {
      id: string;
      guest_id: string;
      listing_id: string;
      host_id: string | null;
    } | null;

    if (!booking) return fail("Booking not found", 404);

    let actorRole: "guest" | "host" = "guest";
    if (booking.guest_id !== user.id) {
      // Check if user is the host — use host_id column if available, else join
      if (booking.host_id && booking.host_id === user.id) {
        actorRole = "host";
      } else {
        const { data: listingRaw } = await supabase
          .from("listings")
          .select("provider_profile_id")
          .eq("id", booking.listing_id as string)
          .maybeSingle();

        const listing = listingRaw as unknown as { provider_profile_id?: string } | null;
        if (listing && user.providerProfile?.id === listing.provider_profile_id) {
          actorRole = "host";
        } else {
          return fail("Not authorized to cancel this booking", 403);
        }
      }
    }

    const result = await transitionBooking({
      bookingId: id,
      toStatus: actorRole === "host" ? "cancelled_by_host" : "cancelled_by_guest",
      actorId: user.id,
      actorRole,
      reason: reason ?? undefined,
    });

    if (!result.ok) return fail(result.error, 400);

    // Send notification to the other party
    const notifyUserId = (actorRole === "guest" ? booking.host_id : booking.guest_id) as string | null;
    if (notifyUserId) {
      const actorName =
        (user as unknown as { full_name?: string; name?: string }).full_name ||
        (user as unknown as { name?: string }).name ||
        "Someone";
      const { data: listingRaw2 } = await supabase
        .from("listings")
        .select("title")
        .eq("id", booking.listing_id as string)
        .maybeSingle();

      const listing2 = listingRaw2 as unknown as { title?: string } | null;
      await notifyBookingCancelled({
        recipientId: notifyUserId as string,
        actorName: actorName as string,
        listingTitle: (listing2?.title as string) || "a listing",
        bookingId: id,
        reason: (reason ?? undefined) as string | undefined,
      });
    }

    return ok({ ok: true, data: toCamelCase(result.booking) });
  } catch (error) {
    console.error("POST /api/bookings/[id]/cancel error:", error);
    return fail("Failed to cancel booking", 500);
  }
}
