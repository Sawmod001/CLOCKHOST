import type { NextRequest } from "next/server";
import { parseSessionToken } from "@/lib/auth/getSessionUser";
import { getUser } from "@/lib/auth/getUser";
import { supabase } from "@/lib/db/supabase";
import { toCamelCase, ok, fail, notFound, forbidden, parseId } from "@/lib/db/supabase-utils";

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
          id: string;
          guest_id: string;
          listing_id: string;
          status: string;
          expires_at?: string | null;
        } | null;
        if (!booking) return notFound("Booking not found");

        // Auto-expire bookings past their expires_at window
        if (booking.status === "awaiting_payment" && booking.expires_at) {
            if (new Date(booking.expires_at as string) < new Date()) {
                await supabase.from("bookings").update({ status: "expired" }).eq("id", booking.id);
                booking.status = "expired";
            }
        }

        const { data: listingRaw } = await supabase.from("listings").select("provider_profile_id, title").eq("id", booking.listing_id as string).maybeSingle();
        const listing = listingRaw as unknown as { provider_profile_id?: string; title?: string } | null;
        const isHost = listing && user.providerProfile?.id === listing.provider_profile_id;
        const isGuest = booking.guest_id === user.id;

        if (!isHost && !isGuest) return forbidden();

        return ok(toCamelCase({ ...booking, listingTitle: (listing?.title as string) || null }));
    } catch (error) {
        console.error("GET /api/bookings/[id] error:", error);
        return fail("Failed to fetch booking", 500);
    }
}
