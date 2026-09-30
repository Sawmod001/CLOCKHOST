import type { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { toCamelCase, ok, fail, notFound } from "@/lib/db/supabase-utils";
import { logAudit } from "@/lib/db/audit";
import { validateCsrfOrigin } from "@/lib/csrf";

interface ExclusiveRequestPayload {
  listingId?: unknown;
  lockId?: unknown;
  headcount?: unknown;
  eventStart?: unknown;
  eventEnd?: unknown;
}

export async function POST(request: NextRequest) {
    try {
        const csrfFail = validateCsrfOrigin(request);
        if (csrfFail) return csrfFail;

        const userOrResponse = await requireAuthenticatedUser(request);
        if (userOrResponse instanceof Response) return userOrResponse;
        const user = userOrResponse;

        const payload = (await request.json()) as ExclusiveRequestPayload;
        const { listingId, lockId, headcount, eventStart, eventEnd } = payload;
        if (!listingId || !lockId || !headcount || !eventStart || !eventEnd) {
            return fail("Missing required booking details", 400);
        }

        const parsedHeadcount = Number(headcount);
        if (!Number.isFinite(parsedHeadcount) || parsedHeadcount < 1) {
            return fail("Headcount must be at least 1", 400);
        }

        const { data: listingRaw } = await supabase.from("listings").select().eq("id", listingId as string).maybeSingle();
        const listing = listingRaw as unknown as {
          booking_type?: string;
          status?: string;
          pricing?: { baseRatePerHour?: unknown } | null;
        } | null;
        if (!listing) return notFound("Listing not found");
        if (listing.booking_type !== "exclusive") return fail("Listing is not exclusive-space", 400);
        if (listing.status !== "active") return fail("Listing is not active", 400);

        const { data: exclusiveLock } = await supabase
            .from("exclusive_locks")
            .select()
            .eq("id", lockId as string)
            .eq("listing_id", listingId as string)
            .eq("status", "open")
            .maybeSingle();

        if (!exclusiveLock) return fail("Exclusive lock is not available", 409);

        const startMs = new Date(eventStart as string).getTime();
        const endMs = new Date(eventEnd as string).getTime();
        const hours = Math.max(1, (endMs - startMs) / (1000 * 60 * 60));
        const pricing = (listing.pricing as { baseRatePerHour?: unknown } | null) ?? {};
        const totalAmountKobo = Math.round(Number(pricing.baseRatePerHour || 0) * hours);
        const commissionKobo = Math.round(totalAmountKobo * 0.05);

        // Price snapshot: what the guest agreed to at booking time
        const pricingSnapshot = {
            baseRatePerHour: Number(pricing.baseRatePerHour) || 0,
            hours,
            totalAmountKobo,
            commissionKobo,
        };

        const termsSnapshot = {
            bookingType: "exclusive",
            eventStart,
            eventEnd,
            headcount: parsedHeadcount,
        };

        const { data: bookingRaw } = await supabase
            .from("bookings")
            .insert({
                listing_id: listingId as string,
                guest_id: user.id,
                booking_type: "exclusive",
                event_start: new Date(eventStart as string).toISOString(),
                event_end: new Date(eventEnd as string).toISOString(),
                headcount: parsedHeadcount,
                status: "awaiting_payment",
                total_amount_kobo: totalAmountKobo,
                commission_kobo: commissionKobo,
                pricing_snapshot: pricingSnapshot,
                terms_snapshot: termsSnapshot,
                exclusive_lock_id: lockId as string,
                expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            })
            .select()
            .single();

        const booking = bookingRaw as unknown as { id: string; status: string } | null;

        await supabase
            .from("exclusive_locks")
            .update({ status: "reserved", booking_id: (booking as { id: string })?.id, reserved_by: user.id, reserved_at: new Date().toISOString() })
            .eq("id", lockId as string);

        await logAudit({
            actorId: user.id,
            action: "exclusive_lock.reserved",
            resourceType: "listing",
            resourceId: listingId as string,
            metadata: { bookingId: (booking as { id: string })?.id, lockId, totalAmountKobo, hours },
        });

        return ok({
            ok: true,
            data: {
                bookingId: (booking as { id: string })?.id,
                status: (booking as { status: string })?.status,
                totalAmountKobo,
                commissionKobo,
            },
        }, 201);
    } catch (error) {
        console.error("POST /api/bookings/exclusive/request error:", error);
        return fail("Failed to request exclusive booking", 500);
    }
}
