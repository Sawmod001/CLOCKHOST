import type { NextRequest } from "next/server";
import { supabase } from "@/lib/db/supabase";
import { parseSessionToken, verifyClerkSession } from "@/lib/auth/getSessionUser";
import { getUser } from "@/lib/auth/getUser";
import { toCamelCase, ok, fail, notFound } from "@/lib/db/supabase-utils";
import { computeCapacityPriceKobo } from "@/lib/bookings/pricing";

export async function POST(request: NextRequest) {
    try {
        const sessionInfo = await parseSessionToken(request);
        if (!sessionInfo?.userId) return fail("Authentication required", 401);

        const isValid = await verifyClerkSession(sessionInfo.sessionId, sessionInfo.userId);
        if (!isValid) return fail("Authentication required", 401);

        const user = await getUser(sessionInfo.userId);
        if (!user) return fail("User not found", 404);

        const payload = (await request.json() as Record<string, unknown>);
        const { listingId, slotId, headcount, guestName, guestEmail, guestPhone } = payload;
        if (!listingId || !slotId || !headcount) {
            return fail("Missing required booking details", 400);
        }

        const { data: listingRaw } = await supabase.from("listings").select().eq("id", listingId as string).maybeSingle();
        const listing = listingRaw as unknown as {
          booking_type?: string;
        } | null;
        if (!listing) return notFound("Listing not found");
        if (listing.booking_type !== "capacity") return fail("Listing is not capacity-based", 400);

        const { data: slotRaw } = await supabase.from("slots").select().eq("id", slotId as string).maybeSingle();
        const slot = slotRaw as unknown as {
          listing_id?: string;
          event_start?: string;
          event_end?: string;
        } | null;
        if (!slot) return notFound("Slot not found");
        if (slot.listing_id !== listingId) return fail("Slot does not belong to this listing", 400);

        const { data: updatedSlot, error } = await supabase
            .rpc("reserve_capacity_slot", {
                p_slot_id: slotId as string,
                p_listing_id: listingId as string,
                p_headcount: headcount as number,
            })
            .maybeSingle();

        if (error || !updatedSlot) {
            return fail("Slot is full or unavailable", 409);
        }

        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        const { data: softHoldRaw } = await supabase
            .from("soft_holds")
            .insert({
                slot_id: slotId as string,
                headcount: headcount as number,
                guest_id: user.id,
                expires_at: expiresAt.toISOString(),
                booking_id: null,
            })
            .select()
            .single();

        const softHold = softHoldRaw as unknown as { id: string; expires_at?: string } | null;

        const totalAmountKobo = computeCapacityPriceKobo({
            listing: listing as unknown as Parameters<typeof computeCapacityPriceKobo>[0]["listing"],
            eventStart: slot.event_start as string | Date,
            eventEnd: slot.event_end as string | Date,
            headcount: headcount as number,
            addOnIds: [],
            includeRequired: true,
        });

        return ok({
            ok: true,
            data: {
                softHoldId: softHold?.id,
                slotId,
                listingId,
                headcount,
                expiresAt: softHold?.expires_at,
                totalAmountKobo,
                guest: { name: guestName || "Guest", email: guestEmail || null, phone: guestPhone || null },
            },
        }, 201);
    } catch (error) {
        console.error("POST /api/soft-holds error:", error);
        return fail("Failed to create soft hold", 500);
    }
}
