import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireHost } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { logAudit } from "@/lib/db/audit";
import { validateCsrfOrigin } from "@/lib/csrf";

/**
 * GET /api/housing/checkin?bookingId=xxx
 * Get check-in/check-out details for a housing booking.
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireHost(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("bookingId");

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId required" }, { status: 400 });
    }

    const { data: bookingRaw } = await supabase
      .from("bookings")
      .select(`
        id, listing_id, guest_id, event_start, event_end, headcount,
        status, terms_snapshot, pricing_snapshot, created_at
      `)
      .eq("id", bookingId)
      .eq("booking_type", "housing")
      .maybeSingle();

    const booking = bookingRaw as unknown as {
      id: string;
      listing_id: string;
      guest_id: string;
      event_start?: string;
      event_end?: string;
      headcount?: number;
      status?: string;
      terms_snapshot?: Record<string, unknown> | null;
      pricing_snapshot?: Record<string, unknown> | null;
    } | null;

    if (!booking) {
      return NextResponse.json({ error: "Housing booking not found" }, { status: 404 });
    }

    // Verify host owns the listing
    const { data: listingRaw } = await supabase
      .from("listings")
      .select("id, provider_profile_id, title, location")
      .eq("id", booking.listing_id as string)
      .maybeSingle();

    const listing = listingRaw as unknown as {
      id: string;
      provider_profile_id?: string;
      title?: string;
      location?: unknown;
    } | null;

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from("provider_profiles")
      .select("id")
      .eq("id", listing.provider_profile_id as string)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: "You do not own this listing" }, { status: 403 });
    }

    // Get guest info
    const { data: guestRaw } = await supabase
      .from("users")
      .select("id, full_name, email, phone")
      .eq("id", booking.guest_id as string)
      .maybeSingle();

    const guest = guestRaw as unknown as {
      id: string;
      full_name?: string;
      email?: string;
      phone?: string;
    } | null;

    // Get guest's active contact access for this listing
    const { data: contactRaw } = await supabase
      .from("contact_access")
      .select("id, phone_revealed, whatsapp_revealed, revealed_at")
      .eq("booking_id", bookingId)
      .maybeSingle();

    const contact = contactRaw as unknown as {
      phone_revealed?: boolean;
      whatsapp_revealed?: boolean;
    } | null;

    const terms = (booking.terms_snapshot || {}) as {
      checkInTime?: string;
      checkOutTime?: string;
      cancellationPolicy?: string;
      houseRules?: string | null;
    };

    return NextResponse.json({
      ok: true,
      data: {
        bookingId: booking.id,
        status: booking.status,
        listing: {
          id: listing.id,
          title: listing.title,
          location: listing.location,
        },
        guest: guest ? {
          id: guest.id,
          name: guest.full_name,
          email: guest.email,
          phone: contact?.phone_revealed ? guest.phone : null,
          whatsapp: contact?.whatsapp_revealed ? guest.phone : null,
        } : null,
        checkIn: {
          date: booking.event_start,
          time: terms.checkInTime || "14:00",
        },
        checkOut: {
          date: booking.event_end,
          time: terms.checkOutTime || "11:00",
        },
        guests: booking.headcount,
        terms: {
          cancellationPolicy: terms.cancellationPolicy || "moderate",
          houseRules: terms.houseRules || null,
        },
        pricing: booking.pricing_snapshot,
      },
    });
  } catch (error) {
    console.error("GET /api/housing/checkin error:", error);
    return NextResponse.json({ error: "Failed to fetch check-in details" }, { status: 500 });
  }
}

/**
 * PATCH /api/housing/checkin
 * Update check-in/check-out times or notes for a housing booking.
 *
 * Body:
 *   { bookingId, checkInTime?, checkOutTime?, hostNotes? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const userOrResponse = await requireHost(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const body = (await request.json() as Record<string, unknown>);
    const { bookingId, checkInTime, checkOutTime, hostNotes } = body;

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId required" }, { status: 400 });
    }

    const { data: bookingRaw } = await supabase
      .from("bookings")
      .select("id, listing_id, terms_snapshot")
      .eq("id", bookingId as string)
      .eq("booking_type", "housing")
      .maybeSingle();

    const booking = bookingRaw as unknown as {
      listing_id?: string;
      terms_snapshot?: Record<string, unknown> | null;
    } | null;

    if (!booking) {
      return NextResponse.json({ error: "Housing booking not found" }, { status: 404 });
    }

    // Verify host owns the listing
    const { data: listingRaw } = await supabase
      .from("listings")
      .select("provider_profile_id")
      .eq("id", booking.listing_id as string)
      .maybeSingle();

    const listing = listingRaw as unknown as { provider_profile_id?: string } | null;

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from("provider_profiles")
      .select("id")
      .eq("id", listing.provider_profile_id as string)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: "You do not own this listing" }, { status: 403 });
    }

    // Validate times
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (checkInTime && !timeRegex.test(checkInTime as string)) {
      return NextResponse.json({ error: "checkInTime must be HH:MM (24h)" }, { status: 400 });
    }
    if (checkOutTime && !timeRegex.test(checkOutTime as string)) {
      return NextResponse.json({ error: "checkOutTime must be HH:MM (24h)" }, { status: 400 });
    }

    // Update terms_snapshot
    const updatedTerms = { ...(booking.terms_snapshot as Record<string, unknown> || {}) } as Record<string, unknown>;
    if (checkInTime) updatedTerms.checkInTime = checkInTime as string;
    if (checkOutTime) updatedTerms.checkOutTime = checkOutTime as string;
    if (hostNotes !== undefined) updatedTerms.hostNotes = hostNotes as string;

    const { error: updateError } = await supabase
      .from("bookings")
      .update({ terms_snapshot: updatedTerms })
      .eq("id", bookingId as string);

    if (updateError) throw updateError;

    await logAudit({
      actorId: user.id,
      action: "booking.checkin_updated",
      resourceType: "booking",
      resourceId: bookingId as string,
      metadata: { checkInTime, checkOutTime, hostNotes },
    });

    return NextResponse.json({ ok: true, data: { terms: updatedTerms } });
  } catch (error) {
    console.error("PATCH /api/housing/checkin error:", error);
    return NextResponse.json({ error: "Failed to update check-in details" }, { status: 500 });
  }
}
