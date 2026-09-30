import type { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";
import { logAudit } from "@/lib/db/audit";
import { validateCsrfOrigin } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/reports
 * Submit a report about a listing, user, or booking.
 *
 * Body:
 *   { type, reason, listingId?, userId?, bookingId?, metadata? }
 */
export async function POST(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const rateLimited = checkRateLimit(request, { windowMs: 60_000, max: 5 }, "report");
    if (rateLimited) return rateLimited;

    const userOrResponse = await requireAuthenticatedUser(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const body = (await request.json() as Record<string, unknown>);
    const { type, reason, listingId, userId, bookingId, metadata } = body;
    const typeStr = type as string | undefined;
    const reasonStr = reason as string | undefined;

    if (!typeStr || !reasonStr) return fail("type and reason required", 400);
    if (reasonStr.length < 10 || reasonStr.length > 2000) {
      return fail("reason must be 10-2000 characters", 400);
    }
    if (!listingId && !userId && !bookingId) {
      return fail("At least one of listingId, userId, or bookingId required", 400);
    }

    const validTypes = [
      "inappropriate_content", "fraud", "harassment", "fake_listing",
      "unsafe_property", "payment_issue", "no_show", "other"
    ];
    if (!validTypes.includes(typeStr as string)) {
      return fail(`type must be one of: ${validTypes.join(", ")}`, 400);
    }

    // Check if blocked
    if (userId) {
      const { data: blocked } = await supabase
        .rpc("check_user_blocked", { p_user_a: user.id, p_user_b: userId })
        .single();

      if (blocked) {
        return fail("Cannot report this user", 403);
      }
    }

    // Use database function for report creation with duplicate detection
    const { data: resultRaw } = await supabase
      .rpc("create_report", {
        p_reporter_id: user.id,
        p_report_type: type as string,
        p_reason: reason as string,
        p_listing_id: (listingId as string) || null,
        p_user_id: (userId as string) || null,
        p_booking_id: (bookingId as string) || null,
        p_metadata: (metadata as Record<string, unknown>) || {},
      })
      .single();

    const result = resultRaw as unknown as { ok?: boolean; error?: string; report_id?: string } | null;

    if (!result?.ok) {
      return fail(result?.error || "Failed to create report", 409);
    }

    await logAudit({
      actorId: user.id,
      action: "report.created",
      resourceType: "report",
      resourceId: result.report_id as string | null | undefined,
      metadata: { type, target_listing: listingId, target_user: userId, target_booking: bookingId },
    });

    return ok({ ok: true, data: { reportId: result.report_id } }, 201);
  } catch (error) {
    console.error("POST /api/reports error:", error);
    return fail("Failed to create report", 500);
  }
}

/**
 * GET /api/reports
 * List reports for the current user (their own reports).
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAuthenticatedUser(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let query = supabase
      .from("reports")
      .select("id, report_type, reason, status, resolution_note, created_at, resolved_at")
      .eq("reporter_id", user.id)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data: reports, error } = await query;
    if (error) throw error;

    return ok({ ok: true, data: reports || [] });
  } catch (error) {
    console.error("GET /api/reports error:", error);
    return fail("Failed to fetch reports", 500);
  }
}
