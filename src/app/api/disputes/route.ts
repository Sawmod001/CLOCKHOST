import type { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";
import { logAudit } from "@/lib/db/audit";
import { validateCsrfOrigin } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/disputes
 * List disputes for the current user.
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAuthenticatedUser(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let query = supabase
      .from("disputes")
      .select(`
        id, dispute_type, description, status, resolution,
        guest_response, host_response, created_at, resolved_at,
        booking:booking_id(id, event_start, event_end, total_amount_kobo,
          listing:listing_id(id, title)),
        filed_by_user:filed_by(id, full_name),
        against_user:against_user_id(id, full_name)
      `)
      .order("created_at", { ascending: false });

    // Filter by user's involvement
    query = query.or(`filed_by.eq.${user.id},against_user_id.eq.${user.id}`);

    // Admin sees all
    if (user.role === "admin") {
      query = supabase
        .from("disputes")
        .select(`
          id, dispute_type, description, status, resolution,
          guest_response, host_response, admin_notes, created_at, resolved_at,
          booking:booking_id(id, event_start, event_end, total_amount_kobo,
            listing:listing_id(id, title)),
          filed_by_user:filed_by(id, full_name),
          against_user:against_user_id(id, full_name)
        `)
        .order("created_at", { ascending: false });
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data: disputes, error } = await query;
    if (error) throw error;

    return ok({ ok: true, data: disputes || [] });
  } catch (error) {
    console.error("GET /api/disputes error:", error);
    return fail("Failed to fetch disputes", 500);
  }
}

interface FileDisputePayload {
  bookingId?: unknown;
  disputeType?: unknown;
  description?: unknown;
  againstUserId?: unknown;
}

/**
 * POST /api/disputes
 * File a new dispute.
 *
 * Body:
 *   { bookingId, disputeType, description, againstUserId? }
 */
export async function POST(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const rateLimited = checkRateLimit(request, { windowMs: 3600_000, max: 5 }, "file-dispute");
    if (rateLimited) return rateLimited;

    const userOrResponse = await requireAuthenticatedUser(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const body = (await request.json()) as FileDisputePayload;
    const { bookingId, disputeType, description, againstUserId } = body;

    if (!bookingId || !disputeType || !description) {
      return fail("bookingId, disputeType, and description required", 400);
    }
    if (typeof description !== "string" || description.length < 20) {
      return fail("Description must be at least 20 characters", 400);
    }

    const validTypes = [
      "no_show", "property_damage", "cleanliness", "noise_complaint",
      "wrong_property", "unlisted_charges", "safety_concern", "other"
    ];
    if (!validTypes.includes(disputeType as string)) {
      return fail(`disputeType must be one of: ${validTypes.join(", ")}`, 400);
    }

    const { data: result } = await supabase
      .rpc("file_dispute", {
        p_booking_id: bookingId as string,
        p_filed_by: user.id,
        p_dispute_type: disputeType as string,
        p_description: description,
        p_against_user_id: (againstUserId as string | undefined) || null,
      })
      .single();

    const typedResult = result as { ok?: unknown; error?: unknown; dispute_id?: string } | null;
    if (!typedResult?.ok) {
      return fail((typedResult?.error as string) || "Failed to file dispute", 400);
    }

    await logAudit({
      actorId: user.id,
      action: "dispute.filed",
      resourceType: "dispute",
      resourceId: typedResult.dispute_id as string,
      metadata: { booking_id: bookingId as string, dispute_type: disputeType as string },
    });

    return ok({ ok: true, data: { disputeId: typedResult.dispute_id } }, 201);
  } catch (error) {
    console.error("POST /api/disputes error:", error);
    return fail("Failed to file dispute", 500);
  }
}
