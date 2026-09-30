import type { NextRequest } from "next/server";
import { requireHost } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { toCamelCase, ok, fail, parseId } from "@/lib/db/supabase-utils";
import { transitionBooking } from "@/lib/bookings/state-machine";
import { notifyBookingDecision } from "@/lib/notifications";
import { validateCsrfOrigin } from "@/lib/csrf";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const csrfFail = validateCsrfOrigin(request);
        if (csrfFail) return csrfFail;

        const { id } = await context.params;
        const userOrResponse = await requireHost(request);
        if (userOrResponse instanceof Response) return userOrResponse;
        const user = userOrResponse;

        const payload = (await request.json()) as Record<string, unknown>;
        const reason = typeof payload?.reason === "string" ? payload.reason.trim() : "";
        if (!reason) return fail("Reason is required", 400);
        if (!parseId(id)) return fail("Invalid booking ID", 400);

        const result = await transitionBooking({
            bookingId: id,
            toStatus: "rejected",
            actorId: user.id,
            actorRole: "host",
            reason,
        });

        if (!result.ok) return fail(result.error, 400);

        // Notify guest
        const { data: booking } = await supabase
            .from("bookings")
            .select("guest_id, listing_id")
            .eq("id", id)
            .maybeSingle();

        if (booking) {
            const bookingRow = booking as unknown as { guest_id: string; listing_id: string };
            const { data: listingRaw } = await supabase
                .from("listings")
                .select("title")
                .eq("id", bookingRow.listing_id)
                .maybeSingle();

            const listing = listingRaw as unknown as { title?: string } | null;
            await notifyBookingDecision({
                guestId: bookingRow.guest_id as string,
                listingTitle: (listing?.title as string) || "a listing",
                bookingId: id,
                decision: "rejected",
            });
        }

        return ok({ ok: true, data: toCamelCase(result.booking) });
    } catch (error) {
        console.error("POST /api/bookings/[id]/reject error:", error);
        return fail("Failed to reject booking", 500);
    }
}
