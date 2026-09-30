import type { NextRequest } from "next/server";
import { parseSessionToken } from "@/lib/auth/getSessionUser";
import { getUser } from "@/lib/auth/getUser";
import { supabase } from "@/lib/db/supabase";
import { ok, fail, notFound, forbidden, parseId } from "@/lib/db/supabase-utils";
import { generateReceipt } from "@/lib/bookings/receipt";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const sessionInfo = await parseSessionToken(request);
    if (!sessionInfo?.userId) return fail("Unauthorized", 401);

    const user = await getUser(sessionInfo.userId);
    if (!user) return fail("User not found", 404);
    if (!parseId(id)) return fail("Invalid booking ID", 400);

    const { data: bookingRaw } = await supabase.from("bookings").select().eq("id", id).maybeSingle();
    const booking = bookingRaw as unknown as {
      guest_id: string;
      listing_id: string;
      status: string;
      gateway_transaction_ref?: string;
    } | null;
    if (!booking) return notFound("Booking not found");

    // Only confirmed or completed bookings have receipts
    if (!["confirmed", "checked_in", "completed"].includes(booking.status as string)) {
      return fail("Receipt only available for confirmed bookings", 409);
    }

    const isGuest = booking.guest_id === user.id;
    if (!isGuest) return forbidden();

    const { data: listingRaw } = await supabase.from("listings").select("title").eq("id", booking.listing_id as string).maybeSingle();
    const listing = listingRaw as unknown as { title?: string } | null;

    const receipt = generateReceipt({
      booking: booking as unknown as Parameters<typeof generateReceipt>[0]["booking"],
      listing: listing as unknown as Parameters<typeof generateReceipt>[0]["listing"],
      guest: { name: user.name, email: user.email },
      payment: { ref: booking.gateway_transaction_ref as string | undefined },
    });

    return ok(receipt);
  } catch (error) {
    console.error("GET /api/bookings/[id]/receipt error:", error);
    return fail("Failed to generate receipt", 500);
  }
}
