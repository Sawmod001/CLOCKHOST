import type { NextRequest } from "next/server";
import { requireHost } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";
import { logAudit } from "@/lib/db/audit";
import { validateCsrfOrigin } from "@/lib/csrf";

/**
 * GET /api/calendar/subscriptions?listingId=xxx
 * List calendar subscriptions for a listing.
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireHost(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get("listingId");

    if (!listingId) return fail("listingId required", 400);

    // Verify ownership
    const { data: listing } = await supabase
      .from("listings")
      .select("id, provider_profile_id")
      .eq("id", listingId)
      .maybeSingle();

    if (!listing) return fail("Listing not found", 404);

    const { data: profile } = await supabase
      .from("provider_profiles")
      .select("id")
      .eq("id", listing.provider_profile_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) return fail("You do not own this listing", 403);

    const { data: subs, error } = await supabase
      .from("calendar_subscriptions")
      .select("id, calendar_name, calendar_url, sync_status, last_synced_at, import_count, created_at")
      .eq("listing_id", listingId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return ok({ ok: true, data: subs || [] });
  } catch (error) {
    console.error("GET /api/calendar/subscriptions error:", error);
    return fail("Failed to fetch subscriptions", 500);
  }
}

/**
 * POST /api/calendar/subscriptions
 * Add a calendar subscription for a listing.
 *
 * Body:
 *   { listingId, calendarUrl, calendarName? }
 */
export async function POST(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const userOrResponse = await requireHost(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const body = (await request.json()) as { listingId?: unknown; calendarUrl?: unknown; calendarName?: unknown };
    const { listingId, calendarUrl, calendarName } = body;

    if (!listingId || !calendarUrl) return fail("listingId and calendarUrl required", 400);

    // Validate URL
    try {
      new URL(calendarUrl as string);
    } catch {
      return fail("Invalid calendar URL", 400);
    }

    // Verify ownership
    const { data: listing } = await supabase
      .from("listings")
      .select("id, provider_profile_id")
      .eq("id", listingId as string)
      .maybeSingle();

    if (!listing) return fail("Listing not found", 404);

    const { data: profile } = await supabase
      .from("provider_profiles")
      .select("id")
      .eq("id", listing.provider_profile_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) return fail("You do not own this listing", 403);

    // Check for duplicate URL
    const { data: existing } = await supabase
      .from("calendar_subscriptions")
      .select("id")
      .eq("listing_id", listingId as string)
      .eq("calendar_url", calendarUrl as string)
      .maybeSingle();

    if (existing) return fail("This calendar URL is already subscribed", 409);

    const { data: sub, error } = await supabase
      .from("calendar_subscriptions")
      .insert({
        listing_id: listingId as string,
        host_id: user.id,
        calendar_url: calendarUrl as string,
        calendar_name: (calendarName as string | undefined) || null,
        sync_status: "active",
      })
      .select()
      .single();

    if (error) throw error;

    const subRow = sub as unknown as { id: string } | null;
    await logAudit({
      actorId: user.id,
      action: "calendar_subscription.created",
      resourceType: "listing",
      resourceId: listingId as string,
      metadata: { subscription_id: subRow?.id, calendar_url: calendarUrl as string },
    });

    return ok({ ok: true, data: { subscriptionId: subRow?.id } }, 201);
  } catch (error) {
    console.error("POST /api/calendar/subscriptions error:", error);
    return fail("Failed to create subscription", 500);
  }
}

/**
 * DELETE /api/calendar/subscriptions?id=xxx
 * Remove a calendar subscription.
 */
export async function DELETE(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const userOrResponse = await requireHost(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { searchParams } = new URL(request.url);
    const subId = searchParams.get("id");

    if (!subId) return fail("id required", 400);

    // Verify ownership
    const { data: subRaw } = await supabase
      .from("calendar_subscriptions")
      .select("id, host_id, listing_id")
      .eq("id", subId)
      .maybeSingle();

    const sub = subRaw as unknown as { id: string; host_id?: string; listing_id?: string } | null;

    if (!sub) return fail("Subscription not found", 404);
    if (sub.host_id !== user.id) return fail("Not authorized", 403);

    const { error } = await supabase
      .from("calendar_subscriptions")
      .delete()
      .eq("id", subId);

    if (error) throw error;

    await logAudit({
      actorId: user.id,
      action: "calendar_subscription.deleted",
      resourceType: "listing",
      resourceId: sub.listing_id as string | null | undefined,
      metadata: { subscription_id: subId },
    });

    return ok({ ok: true });
  } catch (error) {
    console.error("DELETE /api/calendar/subscriptions error:", error);
    return fail("Failed to delete subscription", 500);
  }
}
