import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/helpers";
import { findListingById, updateListing } from "@/lib/db/supabase-queries";
import { logAudit } from "@/lib/db/audit";
import { validateCsrfOrigin } from "@/lib/csrf";
import { toCamelCase, ok, fail, notFound, parseId } from "@/lib/db/supabase-utils";

/**
 * POST /api/admin/listings/[id]/suspend
 * Admin-only: suspend an active listing with a reason.
 *
 * Body:
 *   { reason?: string }
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof Response) return adminOrResponse;
    const admin = adminOrResponse;

    const { id } = await context.params;
    if (!parseId(id)) return fail("Invalid listing ID", 400);

    const listing = await findListingById(id);
    if (!listing) return notFound("Listing not found");
    if (listing.status !== "active") return fail("Only active listings can be suspended", 400);

    const body = (await request.json().catch(() => ({}) as Record<string, unknown>)) as Record<string, unknown>;
    const reason = typeof body?.reason === "string" ? body.reason.trim() || null : null;

    const updated = await updateListing(id, { status: "suspended" });

    await logAudit({
      actorId: admin.id,
      action: "listing.suspended",
      resourceType: "listing",
      resourceId: id,
      metadata: { previousStatus: "active", listingTitle: listing.title, reason },
    });

    return ok(toCamelCase(updated));
  } catch (error) {
    console.error("POST /api/admin/listings/suspend error:", error);
    return fail("Failed to suspend listing", 500);
  }
}
