import type { NextRequest } from "next/server";
import crypto from "crypto";
import { requireAuthenticatedUser } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { resolveExclusiveLock } from "@/lib/bookings/exclusive";
import { ok, fail, notFound, forbidden } from "@/lib/db/supabase-utils";

export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === "production") {
      return fail("Payments are not available yet in production", 503);
    }
    const userOrResponse = await requireAuthenticatedUser(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { bookingId } = (await request.json() as Record<string, unknown>);
    if (!bookingId) return fail("Booking ID is required", 400);

    const { data: bookingRaw } = await supabase.from("bookings").select().eq("id", bookingId as string).maybeSingle();
    const booking = bookingRaw as unknown as {
      id: string;
      guest_id?: string;
      status?: string;
      booking_type?: string;
      listing_id?: string;
      event_start?: string;
    } | null;
    if (!booking) return notFound("Booking not found");
    if (booking.guest_id !== user.id) return forbidden();
    if (booking.status !== "awaiting_payment") {
      return fail("Booking is not awaiting payment", 400);
    }

    const txRef = `mock-${booking.id}-${crypto.randomUUID().slice(0, 8)}`;

    try {
      await supabase.from("processed_webhooks").insert({
        gateway_transaction_ref: txRef,
        booking_id: booking.id,
        gateway: "mock",
      });
    } catch (err) {
      if ((err as { code?: string })?.code === "23505") {
        return ok({ received: true, duplicate: true });
      }
      throw err;
    }

    if (booking.booking_type === "exclusive") {
      const { data: lockRaw } = await supabase
        .from("exclusive_locks")
        .select()
        .eq("listing_id", booking.listing_id as string)
        .eq("event_start", booking.event_start as string)
        .maybeSingle();

      const lock = lockRaw as unknown as { id: string } | null;
      if (!lock) return notFound("Exclusive lock not found");

      const result = await resolveExclusiveLock({
        lockId: lock.id as string,
        bookingId: booking.id as string,
        listingId: booking.listing_id as string,
        eventStart: booking.event_start as string | Date,
      });

      if (!((result as { won?: boolean }).won)) {
        return fail("Exclusive lock already taken by another booking", 409);
      }

      const { error: updateError } = await supabase.from("bookings").update({
        status: "confirmed",
        gateway_transaction_ref: txRef,
      }).eq("id", booking.id);

      if (updateError) throw updateError;

      return ok({
        confirmed: true,
        bookingType: "exclusive",
        won: true,
        bookingId: booking.id,
      });
    }

    const { error: updateError } = await supabase.from("bookings").update({
      status: "confirmed",
      gateway_transaction_ref: txRef,
    }).eq("id", booking.id);

    if (updateError) throw updateError;

    return ok({
      confirmed: true,
      bookingType: "capacity",
      bookingId: booking.id,
    });
  } catch (error) {
    console.error("POST /api/payments/mock-confirm error:", error);
    return fail("Failed to confirm payment", 500);
  }
}