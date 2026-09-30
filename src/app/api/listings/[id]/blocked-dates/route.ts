import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireHost } from "@/lib/auth/helpers";
import { findProviderProfileByUserId, findListingById } from "@/lib/db/supabase-queries";
import { supabase } from "@/lib/db/supabase";
import { logAudit } from "@/lib/db/audit";
import { validateCsrfOrigin } from "@/lib/csrf";
import { z } from "zod";

const BlockDatesSchema = z.object({
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(90),
  reason: z.string().max(200).optional().default("host_blocked"),
});

const UnblockDatesSchema = z.object({
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(90),
});

async function verifyHostOwnership(request: NextRequest, listingId: string) {
  const userOrResponse = await requireHost(request);
  if (userOrResponse instanceof Response) {
    const body = await userOrResponse.clone().json().catch(() => ({ error: "Authentication required" }));
    return { error: body.error || "Authentication required", status: userOrResponse.status };
  }
  const user = userOrResponse;

  const profile = await findProviderProfileByUserId(user.id);
  if (!profile) return { error: "Provider profile not found", status: 404 };

  const listing = await findListingById(listingId);
  if (!listing) return { error: "Listing not found", status: 404 };
  if (listing.provider_profile_id !== profile.id) return { error: "Not your listing", status: 403 };
  if (listing.vertical !== "housing") return { error: "Calendar is only for housing listings", status: 400 };

  return { user, profile, listing };
}

/**
 * GET /api/listings/[id]/blocked-dates?month=YYYY-MM
 * Returns all blocked dates for a listing, optionally filtered by month.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const listing = await findListingById(id);
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const month = url.searchParams.get("month"); // YYYY-MM

    let query = supabase
      .from("blocked_dates")
      .select("id, blocked_date, reason, booking_id")
      .eq("listing_id", id)
      .order("blocked_date");

    if (month) {
      const startDate = `${month}-01`;
      const parts = month.split("-").map(Number);
      const y = parts[0] as number;
      const m = parts[1] as number;
      const lastDay = new Date(y, m, 0).getDate();
      const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;
      query = query.gte("blocked_date", startDate).lte("blocked_date", endDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error("GET /api/listings/[id]/blocked-dates error:", error);
    return NextResponse.json({ error: "Failed to load blocked dates" }, { status: 500 });
  }
}

/**
 * POST /api/listings/[id]/blocked-dates
 * Body: { dates: ["YYYY-MM-DD", ...], reason?: "host_blocked" }
 * Block multiple dates for a housing listing.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const { id } = await context.params;
    const auth = await verifyHostOwnership(request, id);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = (await request.json() as Record<string, unknown>);
    const parsed = BlockDatesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const { dates, reason } = parsed.data;

    // Check for already blocked dates
    const { data: existingRaw } = await supabase
      .from("blocked_dates")
      .select("blocked_date")
      .eq("listing_id", id)
      .in("blocked_date", dates);

    const existing = existingRaw as unknown as Array<{ blocked_date: string }> | null;
    const alreadyBlocked = (existing || []).map((e: { blocked_date: string }) => e.blocked_date);
    const newDates = dates.filter((d) => !alreadyBlocked.includes(d));

    if (newDates.length === 0) {
      return NextResponse.json({ error: "All selected dates are already blocked", blocked: alreadyBlocked }, { status: 409 });
    }

    // Check for existing bookings on these dates
    const { data: conflictingBookingsRaw } = await supabase
      .from("bookings")
      .select("id, event_start, event_end")
      .eq("listing_id", id)
      .in("status", ["pending", "confirmed", "awaiting_payment"]);

    const conflictingBookings = conflictingBookingsRaw as unknown as Array<{
      event_start: string;
      event_end: string;
    }> | null;
    const conflictingDates = new Set<string>();
    if (conflictingBookings) {
      for (const booking of conflictingBookings) {
        const bStart = new Date(booking.event_start as string);
        const bEnd = new Date(booking.event_end as string);
        for (const dateStr of newDates) {
          const d = new Date(dateStr);
          if (d >= bStart && d < bEnd) {
            conflictingDates.add(dateStr);
          }
        }
      }
    }

    const safeDates = newDates.filter((d) => !conflictingDates.has(d));
    const blockedByBooking = newDates.filter((d) => conflictingDates.has(d));

    if (safeDates.length === 0) {
      return NextResponse.json({
        error: "All selected dates have existing bookings",
        blockedByBooking: [...conflictingDates],
      }, { status: 409 });
    }

    // Insert blocked dates
    const rows = safeDates.map((d) => ({
      listing_id: id,
      blocked_date: d,
      reason,
    }));

    const { error: insertError } = await (supabase.from("blocked_dates").insert as unknown as (
      rows: Record<string, unknown>[] | Record<string, unknown>
    ) => Promise<{ error: unknown }>)(
      rows as unknown as Record<string, unknown>[]
    );
    if (insertError) throw insertError;

    await logAudit({
      actorId: (auth as unknown as { user: { id: string } }).user.id,
      action: "dates.blocked",
      resourceType: "listing",
      resourceId: id,
      metadata: { dates: safeDates, reason, count: safeDates.length },
    });

    return NextResponse.json({
      blocked: safeDates,
      alreadyBlocked,
      blockedByBooking: blockedByBooking,
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/listings/[id]/blocked-dates error:", error);
    return NextResponse.json({ error: "Failed to block dates" }, { status: 500 });
  }
}

/**
 * DELETE /api/listings/[id]/blocked-dates
 * Body: { dates: ["YYYY-MM-DD", ...] }
 * Unblock dates (only host-blocked, not booking-blocked).
 */
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const { id } = await context.params;
    const auth = await verifyHostOwnership(request, id);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = (await request.json() as Record<string, unknown>);
    const parsed = UnblockDatesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const { dates } = parsed.data;

    // Only delete host-blocked dates (not booking-blocked)
    const { data: deletedRaw, error } = await (supabase
      .from("blocked_dates")
      .delete()
      .eq("listing_id", id)
      .in("blocked_date", dates) as unknown as {
      is: (col: string, val: null) => {
        select: (cols: string) => Promise<{ data: unknown; error: unknown }>;
      };
    })
      .is("booking_id", null)
      .select("blocked_date");

    if (error) throw error;

    const deleted = deletedRaw as unknown as Array<{ blocked_date: string }> | null;
    await logAudit({
      actorId: (auth as unknown as { user: { id: string } }).user.id,
      action: "dates.unblocked",
      resourceType: "listing",
      resourceId: id,
      metadata: { dates: (deleted || []).map((d: { blocked_date: string }) => d.blocked_date) },
    });

    return NextResponse.json({ unblocked: (deleted || []).map((d: { blocked_date: string }) => d.blocked_date) });
  } catch (error) {
    console.error("DELETE /api/listings/[id]/blocked-dates error:", error);
    return NextResponse.json({ error: "Failed to unblock dates" }, { status: 500 });
  }
}
