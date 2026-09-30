import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireHost } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { logAudit } from "@/lib/db/audit";
import { validateCsrfOrigin } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/housing/tenancy?listingId=xxx
 * List tenancy periods for a listing.
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireHost(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get("listingId");

    if (!listingId) {
      return NextResponse.json({ error: "listingId required" }, { status: 400 });
    }

    // Verify host owns the listing
    const { data: listing } = await supabase
      .from("listings")
      .select("id, provider_profile_id")
      .eq("id", listingId)
      .maybeSingle();

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from("provider_profiles")
      .select("id")
      .eq("id", listing.provider_profile_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: "You do not own this listing" }, { status: 403 });
    }

    const { data: periods, error } = await supabase
      .from("tenancy_periods")
      .select()
      .eq("listing_id", listingId)
      .order("start_date", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ ok: true, data: periods || [] });
  } catch (error) {
    console.error("GET /api/housing/tenancy error:", error);
    return NextResponse.json({ error: "Failed to fetch tenancy periods" }, { status: 500 });
  }
}

/**
 * POST /api/housing/tenancy
 * Create a tenancy period for a housing listing.
 *
 * Body:
 *   { listingId, startDate, endDate, status?, minNights?, maxNights?,
 *     nightlyRateOverride?, notes? }
 */
export async function POST(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const rateLimited = checkRateLimit(request, { windowMs: 60_000, max: 10 }, "tenancy-create");
    if (rateLimited) return rateLimited;

    const userOrResponse = await requireHost(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const body = (await request.json() as Record<string, unknown>);
    const {
      listingId,
      startDate,
      endDate,
      status = "available",
      minNights = 1,
      maxNights = null,
      nightlyRateOverride = null,
      notes = null,
    } = body;

    if (!listingId || !startDate || !endDate) {
      return NextResponse.json({ error: "listingId, startDate, and endDate required" }, { status: 400 });
    }

    if (!["available", "blocked", "maintenance"].includes(status as string)) {
      return NextResponse.json({ error: "status must be available, blocked, or maintenance" }, { status: 400 });
    }

    // Use atomic database function
    const { data: resultRaw } = await supabase
      .rpc("create_tenancy_period", {
        p_listing_id: listingId as string,
        p_host_id: user.id,
        p_start_date: startDate as string,
        p_end_date: endDate as string,
        p_status: status as string,
        p_min_nights: minNights as number,
        p_max_nights: maxNights as number | null,
        p_nightly_rate_override: nightlyRateOverride as number | null,
        p_notes: notes as string | null,
      })
      .single();

    const result = resultRaw as unknown as { ok?: boolean; error?: string; period_id?: string } | null;

    if (!result?.ok) {
      return NextResponse.json({ error: result?.error || "Failed to create period" }, { status: 409 });
    }

    await logAudit({
      actorId: user.id,
      action: "tenancy_period.created",
      resourceType: "listing",
      resourceId: listingId as string,
      metadata: { periodId: result.period_id, startDate, endDate, status },
    });

    return NextResponse.json({ ok: true, data: result }, { status: 201 });
  } catch (error) {
    console.error("POST /api/housing/tenancy error:", error);
    return NextResponse.json({ error: "Failed to create tenancy period" }, { status: 500 });
  }
}

/**
 * DELETE /api/housing/tenancy?id=xxx&listingId=xxx
 * Delete a tenancy period (only if not booked).
 */
export async function DELETE(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const userOrResponse = await requireHost(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get("id");
    const listingId = searchParams.get("listingId");

    if (!periodId || !listingId) {
      return NextResponse.json({ error: "id and listingId required" }, { status: 400 });
    }

    // Verify ownership
    const { data: period } = await supabase
      .from("tenancy_periods")
      .select("id, status, booking_id")
      .eq("id", periodId)
      .eq("listing_id", listingId)
      .maybeSingle();

    if (!period) {
      return NextResponse.json({ error: "Period not found" }, { status: 404 });
    }

    if (period.status === "booked" && period.booking_id) {
      return NextResponse.json({ error: "Cannot delete a booked period. Cancel the booking first." }, { status: 409 });
    }

    const { error } = await supabase
      .from("tenancy_periods")
      .delete()
      .eq("id", periodId);

    if (error) throw error;

    await logAudit({
      actorId: user.id,
      action: "tenancy_period.deleted",
      resourceType: "listing",
      resourceId: listingId,
      metadata: { periodId, status: period.status },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/housing/tenancy error:", error);
    return NextResponse.json({ error: "Failed to delete tenancy period" }, { status: 500 });
  }
}
