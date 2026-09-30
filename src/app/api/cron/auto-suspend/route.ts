import type { NextRequest } from "next/server";
import { supabase } from "@/lib/db/supabase";
import { sendBulkNotifications } from "@/lib/notifications";

interface StaleBooking {
  id: string;
  guest_id: string;
  listing_id: string;
  created_at: string;
}

/**
 * GET /api/cron/auto-suspend
 * Auto-cancel pending bookings where host hasn't responded within 48 hours.
 * Also auto-suspend listings with 3+ expired bookings in 30 days.
 *
 * Called by Vercel Cron or manually with CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  try {
    const expected = process.env.CRON_SECRET;
    const provided = request.headers.get("authorization") || "";
    if (!expected || provided !== `Bearer ${expected}`) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const cutoff48h = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

    // 1. Find pending bookings older than 48h
    const { data: staleBookings, error: fetchError } = await supabase
      .from("bookings")
      .select("id, guest_id, listing_id, created_at")
      .eq("status", "pending_approval")
      .lt("created_at", cutoff48h);

    if (fetchError) throw fetchError;

    let cancelledCount = 0;
    const hostNotifications = new Map<string, Array<{ listingTitle: string; bookingId: string }>>();

    for (const booking of ((staleBookings || []) as StaleBooking[])) {
      // Cancel the stale booking
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ status: "cancelled_system", updated_at: now.toISOString() })
        .eq("id", booking.id)
        .eq("status", "pending_approval");

      if (!updateError) {
        cancelledCount++;

        // Release capacity slot if applicable
        await supabase
          .from("slots")
          .update({ status: "open", reserved_by: null, reserved_at: null })
          .eq("reserved_by", booking.id)
          .eq("status", "reserved");

        // Release exclusive lock if applicable
        await supabase
          .from("exclusive_locks")
          .update({ status: "open", booking_id: null, reserved_by: null, reserved_at: null })
          .eq("booking_id", booking.id)
          .eq("status", "reserved");

        // Collect host notifications
        const { data: listing } = await supabase
          .from("listings")
          .select("provider_profile_id, title")
          .eq("id", booking.listing_id)
          .maybeSingle();

        if (listing) {
          const listingRow = listing as unknown as { provider_profile_id?: string; title?: string };
          const { data: profileRaw } = await supabase
            .from("provider_profiles")
            .select("user_id")
            .eq("id", listingRow.provider_profile_id as string)
            .maybeSingle();

          const profile = profileRaw as unknown as { user_id?: string } | null;
          if (profile?.user_id) {
            if (!hostNotifications.has(profile.user_id as string)) {
              hostNotifications.set(profile.user_id as string, []);
            }
            hostNotifications.get(profile.user_id as string)?.push({
              listingTitle: listingRow.title as string,
              bookingId: booking.id,
            });
          }
        }

        // Notify guest
        await sendBulkNotifications({
          userIds: [booking.guest_id],
          type: "booking_cancelled",
          title: "Booking Expired",
          body: `Your booking request was automatically cancelled because the host did not respond within 48 hours.`,
          link: "/dashboard",
          metadata: { booking_id: booking.id, reason: "host_no_response_48h" },
        });
      }
    }

    // Send batched notifications to hosts
    for (const [hostId, bookings] of hostNotifications) {
      const count = bookings.length;
      await sendBulkNotifications({
        userIds: [hostId],
        type: "booking_cancelled",
        title: "Booking Auto-Cancelled",
        body: `${count} booking request${count > 1 ? "s were" : " was"} automatically cancelled because you did not respond within 48 hours.`,
        link: "/host/bookings",
        metadata: { cancelled_count: count, reason: "no_response_48h" },
      });
    }

    // 2. Auto-suspend listings with 3+ auto-cancellations in 30 days
    const cutoff30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: troubleListings } = await supabase
      .from("bookings")
      .select("listing_id")
      .eq("status", "cancelled_system")
      .gte("created_at", cutoff30d);

    const listingCounts: Record<string, number> = {};
    for (const b of ((troubleListings || []) as Array<{ listing_id: string }>)) {
      listingCounts[b.listing_id] = (listingCounts[b.listing_id] || 0) + 1;
    }

    let suspendedCount = 0;
    for (const [listingId, count] of Object.entries(listingCounts)) {
      if (count >= 3) {
        const { data: listing } = await supabase
          .from("listings")
          .select("status, provider_profile_id, title")
          .eq("id", listingId)
          .maybeSingle();

        if (listing?.status === "active") {
          await supabase
            .from("listings")
            .update({ status: "suspended" })
            .eq("id", listingId);

          suspendedCount++;

          // Notify host
          const listingRow2 = listing as unknown as { provider_profile_id?: string; title?: string; status?: string };
          if (listingRow2.provider_profile_id) {
            const { data: profileRaw } = await supabase
              .from("provider_profiles")
              .select("user_id")
              .eq("id", listingRow2.provider_profile_id as string)
              .maybeSingle();

            const profile = profileRaw as unknown as { user_id?: string } | null;
            if (profile?.user_id) {
              await sendBulkNotifications({
                userIds: [profile.user_id as string],
                type: "listing_suspended",
                title: "Listing Auto-Suspended",
                body: `Your listing "${listingRow2.title as string}" was automatically suspended due to ${count} expired bookings in the last 30 days.`,
                link: "/host/listings",
                metadata: { listing_id: listingId, auto_suspension: true, count },
              });
            }
          }
        }
      }
    }

    return Response.json({
      ok: true,
      cancelledBookings: cancelledCount,
      suspendedListings: suspendedCount,
    });
  } catch (error) {
    console.error("GET /api/cron/auto-suspend error:", error);
    return Response.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
